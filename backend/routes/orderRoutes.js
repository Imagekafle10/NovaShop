const express = require("express");
const {
  addOrderItems,
  getMyOrders,
  getOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
} = require("../controllers/orderController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

const router = express.Router();

const validate = require("../middleware/validate");
const { orderSchema } = require("../validators/orderValidator");

router
  .route("/")
  .post(protect, validate(orderSchema), addOrderItems)
  .get(protect, admin, getOrders);
router.route("/myorders").get(protect, getMyOrders);
router.route("/:id/status").put(protect, updateOrderStatus);
router.route("/:id").get(protect, getOrderById).delete(protect, deleteOrder);

module.exports = router;
