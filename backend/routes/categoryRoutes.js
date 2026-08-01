const express = require("express");
const {
  getCategories,
  addCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/", getCategories);
router.post("/", protect, admin, addCategory);
router.delete("/:id", protect, admin, deleteCategory);

module.exports = router;
