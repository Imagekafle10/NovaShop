const Order = require("../models/Order");
const Product = require("../models/Product");
const sendEmail = require("../utils/sendEmail");
const {
  orderConfirmationEmail,
  orderStatusEmail,
} = require("../utils/emailTemplates");

const addOrderItems = async (req, res) => {
  try {
    const { items, totalAmount, address, paymentId } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No order items" });
    }

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product not found: ${item.productId}` });
      }
      const qty = item.qty || item.quantity || 1;
      if (product.stock < qty) {
        return res
          .status(400)
          .json({ message: `Insufficient stock for ${product.name}` });
      }
    }

    const order = new Order({
      userId: req.user._id,
      items: items.map((item) => ({
        productId: item.productId,
        qty: item.qty || item.quantity || 1,
        price: item.price,
        originalPrice: item.originalPrice || item.price,
      })),
      totalAmount,
      address,
      paymentId,
    });

    const createdOrder = await order.save();

    // Populate product name/imageUrl so the confirmation email can display them
    await createdOrder.populate("items.productId", "name imageUrl");

    for (const item of items) {
      const qty = item.qty || item.quantity || 1;
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -qty },
      });
    }

    const originalTotal = items.reduce((sum, item) => {
      const qty = item.qty || item.quantity || 1;
      const originalPrice = item.originalPrice || item.price || 0;
      return sum + originalPrice * qty;
    }, 0);
    const savedAmount = originalTotal - totalAmount;

    // Build flat item objects (name/imageUrl come from the populated productId)
    // so the email template's item.name / item.imageUrl aren't undefined.
    const emailItems = createdOrder.items.map((item) => ({
      name: item.productId?.name || "Item",
      imageUrl: item.productId?.imageUrl,
      qty: item.qty,
      price: item.price,
    }));

    const confirmationEmail = orderConfirmationEmail({
      userName: req.user.name,
      order: { ...createdOrder.toObject(), items: emailItems },
      address,
      totalAmount,
      savedAmount,
    });

    await sendEmail({
      email: req.user.email,
      subject: confirmationEmail.subject,
      message: confirmationEmail.html,
    });

    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate("items.productId", "name imageUrl price category")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) {
      const statusList = status.split(",").map((s) => s.trim());
      filter.status = { $in: statusList };
    }

    const orders = await Order.find(filter)
      .populate("userId", "id name")
      .populate("items.productId", "name imageUrl price")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("userId", "id name email")
      .populate("items.productId", "name imageUrl price");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (
      order.userId._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this order" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "userId",
      "name email",
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const isOwner = order.userId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this order" });
    }

    const previousStatus = order.status;

    if (isAdmin) {
      const newStatus = req.body.status || order.status;
      if (newStatus === "Cancelled" && previousStatus !== "Cancelled") {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: item.qty },
          });
        }
      }
      order.status = newStatus;
    } else {
      if (req.body.status !== "Cancelled") {
        return res
          .status(403)
          .json({ message: "You can only cancel an order" });
      }
      if (order.status !== "Pending") {
        return res
          .status(400)
          .json({ message: "Only pending orders can be cancelled" });
      }
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.qty },
        });
      }
      order.status = "Cancelled";
    }

    // ✅ Only validate fields that actually changed (status), so pre-existing
    // orders missing newer required fields (e.g. address.phone) don't block
    // legitimate status updates.
    const updatedOrder = await order.save({ validateModifiedOnly: true });

    if (updatedOrder.status !== previousStatus && order.userId?.email) {
      const email = orderStatusEmail({
        userName: order.userId.name,
        order: updatedOrder,
      });
      if (email) {
        await sendEmail({
          email: order.userId.email,
          subject: email.subject,
          message: email.html,
        });
      }
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this order" });
    }

    await order.deleteOne();
    res.json({ message: "Order removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addOrderItems,
  getMyOrders,
  getOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
};
