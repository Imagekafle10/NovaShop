const Review = require("../models/Review");
const Product = require("../models/Product");

// POST /api/products/:id/reviews
const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.id;

    const alreadyReviewed = await Review.findOne({
      productId,
      userId: req.user._id,
    });
    if (alreadyReviewed) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this product" });
    }

    const review = await Review.create({
      productId,
      userId: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment,
    });

    // Recalculate product ratings
    const allReviews = await Review.find({ productId });
    const numReviews = allReviews.length;
    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / numReviews;

    await Product.findByIdAndUpdate(productId, {
      ratings: avgRating.toFixed(1),
      numReviews,
    });

    res.status(201).json(review);
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this product" });
    }
    res.status(500).json({ message: error.message });
  }
};

// GET /api/products/:id/reviews
const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.id }).sort({
      createdAt: -1,
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addReview, getReviews };
