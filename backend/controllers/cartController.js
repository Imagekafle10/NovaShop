const Cart = require("../models/Cart");

// GET /api/cart
const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    res.json(cart?.items || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/cart  — add or update item
const addToCart = async (req, res) => {
  try {
    const { productId, name, price, originalPrice, imageUrl, qty } = req.body;
    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      cart = new Cart({ userId: req.user._id, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      (i) => String(i.productId) === String(productId),
    );

    if (existingIndex >= 0) {
      cart.items[existingIndex].qty = qty;
    } else {
      cart.items.push({ productId, name, price, originalPrice, imageUrl, qty });
    }

    await cart.save();
    res.json(cart.items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/cart/:productId
const removeFromCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) return res.json([]);

    cart.items = cart.items.filter(
      (i) => String(i.productId) !== String(req.params.productId),
    );

    await cart.save();
    res.json(cart.items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/cart  — clear entire cart
const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getCart, addToCart, removeFromCart, clearCart };
