const express = require("express");
const {
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
} = require("../controllers/cartController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getCart);
router.post("/", protect, addToCart);
router.delete("/clear", protect, clearCart);
router.delete("/:productId", protect, removeFromCart);

module.exports = router;
