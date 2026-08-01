const express = require("express");
const {
  registerUser,
  loginUser,
  getUsers,
  toggleUserStatus,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const router = express.Router();
const validate = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../validators/authValidator");

router.post("/register", validate(registerSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);
router.get("/users", protect, admin, getUsers);
router.put("/users/:id/status", protect, toggleUserStatus);

module.exports = router;
