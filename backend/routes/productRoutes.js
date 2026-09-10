const express = require("express");
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getForYouProducts,
  searchProductsHandler, // ✅ new
  getRelatedProducts, // ✅ new
} = require("../controllers/productController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const multer = require("multer");
// const upload = multer({ dest: "uploads/" });
const upload = multer({ dest: "/tmp/uploads/" });

const router = express.Router();

const validate = require("../middleware/validate");
const { productSchema } = require("../validators/productValidator");

// ── Static routes first (must be before /:id) ─────────────────
router.get("/categories", getCategories);
router.get("/search", searchProductsHandler);
router.get("/foryou", protect, getForYouProducts);

// ── Collection ────────────────────────────────────────────────
router
  .route("/")
  .get(getProducts)
  .post(
    protect,
    admin,
    upload.single("image"),
    validate(productSchema),
    createProduct,
  );

// ── Single product ────────────────────────────────────────────
router
  .route("/:id")
  .get(getProductById)
  .put(
    protect,
    admin,
    upload.single("image"),
    validate(productSchema),
    updateProduct,
  )
  .delete(protect, admin, deleteProduct);

router.get("/:id/related", getRelatedProducts); // ✅ /api/products/:id/related

// ── Reviews ───────────────────────────────────────────────────
const { addReview, getReviews } = require("../controllers/reviewController");
router.route("/:id/reviews").get(getReviews).post(protect, addReview);

module.exports = router;
