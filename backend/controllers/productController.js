const Product = require("../models/Product");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const cloudinary = require("../config/cloudinary");
const { searchProducts } = require("../utils/cosineSimilarity");
const { findRelatedProducts } = require("../utils/tfidf");
const { getRecommendations } = require("../utils/Recommendationengine");

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) res.json(product);
    else res.status(404).json({ message: "Product not found" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, discount } = req.body;

    if (Number(stock) > 100)
      return res.status(400).json({ message: "Stock cannot exceed 100" });

    let imageUrl = "";
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
    }

    const product = new Product({
      name,
      description,
      price,
      category,
      stock,
      imageUrl,
      discount: Number(discount) || 0,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, discount } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    product.category = category || product.category;
    product.stock = stock || product.stock;
    product.discount =
      discount !== undefined ? Number(discount) : product.discount;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      product.imageUrl = result.secure_url;
    }

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      await product.deleteOne();
      res.json({ message: "Product removed" });
    } else res.status(404).json({ message: "Product not found" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const { category, latest } = req.query;
    let filter = {};
    if (category) filter.category = category;

    let query = Product.find(filter).sort({ createdAt: -1 });
    if (latest === "true") query = query.limit(8);

    const products = await query;
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    res.json(categories.filter(Boolean).sort());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Backend search: cosine similarity + substring match
// GET /api/products/search?q=wireless&category=Electronics
const searchProductsHandler = async (req, res) => {
  try {
    const { q, category } = req.query;
    if (!q || !q.trim())
      return res.status(400).json({ message: "Query is required" });

    let filter = {};
    if (category && category !== "All") filter.category = category;

    const allProducts = await Product.find(filter);
    const results = searchProducts(allProducts, q.trim());
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Related products: TF-IDF cosine similarity
// GET /api/products/:id/related?limit=4
const getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;

    const allProducts = await Product.find({ stock: { $gt: 0 } });
    const related = findRelatedProducts(allProducts, id, allProducts.length);
    res.json(related);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getForYouProducts = async (req, res) => {
  try {
    const userId = req.user._id;

    const currentUserOrders = await Order.find({ userId })
      .populate("items.productId", "name category ratings stock price")
      .sort({ createdAt: -1 })
      .limit(20);

    // pull the user's current cart
    const cart = await Cart.findOne({ userId }).populate(
      "items.productId",
      "name category ratings stock price",
    );

    const cartItems = (cart?.items || [])
      .filter((i) => i.productId)
      .map((i) => ({
        productId: i.productId,
        qty: (i.quantity ?? i.qty ?? 1) * 2, // boost: cart intent > past purchase
      }));

    const cartAsOrder = cartItems.length ? [{ items: cartItems }] : [];

    const combinedUserOrders = [...cartAsOrder, ...currentUserOrders];

    if (combinedUserOrders.length === 0) {
      console.log("returning empty — no orders or cart");
      return res.json([]);
    }

    const allUsersOrders = await Order.find({ userId: { $ne: userId } })
      .populate("items.productId", "name category ratings stock price")
      .sort({ createdAt: -1 })
      .limit(500);

    const allProducts = await Product.find({ stock: { $gt: 0 } });

    const recommendations = getRecommendations(
      combinedUserOrders,
      allUsersOrders,
      allProducts,
      allProducts.length,
    );

    res.json(recommendations);
  } catch (error) {
    console.error("ForYou error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getForYouProducts,
  searchProductsHandler,
  getRelatedProducts,
};
