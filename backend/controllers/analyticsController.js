const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

// ── Revenue filter:
//    Online payments  → count always (payment already collected)
//    COD              → count ONLY when Delivered
const REVENUE_FILTER = {
  $or: [
    // Online payment — any status
    { paymentId: { $not: /^COD_/ } },
    // COD — only when delivered
    { paymentId: /^COD_/, status: "Delivered" },
  ],
};

// ── Range → { startDate, granularity, dateFormat } ───────────
// granularity controls how revenue buckets are grouped and labeled.
const getRangeConfig = (range) => {
  const now = new Date();

  switch (range) {
    case "1d": {
      const start = new Date(now);
      start.setHours(now.getHours() - 24);
      return {
        startDate: start,
        granularity: "hour",
        dateFormat: "%Y-%m-%d %H:00",
      };
    }
    case "1m": {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { startDate: start, granularity: "day", dateFormat: "%Y-%m-%d" };
    }
    case "1y": {
      const start = new Date(now);
      start.setMonth(now.getMonth() - 11);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { startDate: start, granularity: "month", dateFormat: "%Y-%m" };
    }
    case "all":
      return { startDate: null, granularity: "month", dateFormat: "%Y-%m" };
    case "6m": {
      const start = new Date(now);
      start.setMonth(now.getMonth() - 5);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { startDate: start, granularity: "month", dateFormat: "%Y-%m" };
    }
    default: {
      const start = new Date(now);
      start.setHours(now.getHours() - 24);
      return {
        startDate: start,
        granularity: "hour",
        dateFormat: "%Y-%m-%d %H:00",
      };
    }
  }
};

// ── Turns a raw bucket key (e.g. "2026-07-31 14:00") into a
//    short display label appropriate for its granularity ────
const formatLabel = (bucketKey, granularity) => {
  if (granularity === "hour") {
    const d = new Date(bucketKey.replace(" ", "T") + ":00");
    return d.toLocaleTimeString(undefined, { hour: "numeric" });
  }
  if (granularity === "day") {
    const d = new Date(bucketKey + "T00:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  // month → "2026-07" => "Jul '26"
  const [year, month] = bucketKey.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return (
    d.toLocaleDateString(undefined, { month: "short" }) + " '" + year.slice(2)
  );
};

const getAdminStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments({});
    const totalProducts = await Product.countDocuments({});
    const totalUsers = await User.countDocuments({ role: "user" });

    // ✅ FIX: Only sum COD orders that are Delivered
    const orders = await Order.find(REVENUE_FILTER);
    const totalRevenue = orders.reduce((acc, o) => acc + o.totalAmount, 0);

    res.json({ totalOrders, totalProducts, totalUsers, totalRevenue });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAnalytics = async (req, res) => {
  try {
    // ── basic counts (always all-time, not range-bound) ───────
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments();

    // ✅ FIX: Total revenue — exclude undelivered COD
    const revenueAgg = await Order.aggregate([
      { $match: REVENUE_FILTER },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total ?? 0;

    // ── resolve the selected range once, reuse everywhere ─────
    const range = ["1d", "1m", "6m", "1y", "all"].includes(req.query.range)
      ? req.query.range
      : "1d";
    const { startDate, granularity, dateFormat } = getRangeConfig(range);
    const dateMatch = startDate ? { createdAt: { $gte: startDate } } : {};

    // ── orders by status — now scoped to the selected range ───
    const statusAgg = await Order.aggregate([
      { $match: dateMatch },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const ordersByStatus = {};
    statusAgg.forEach((s) => {
      ordersByStatus[s._id?.toLowerCase()] = s.count;
    });

    // ── revenue over time — range-based, adaptive granularity ─
    const revenueMatchStage = { ...REVENUE_FILTER, ...dateMatch };

    const series = await Order.aggregate([
      { $match: revenueMatchStage },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthlyRevenue = series.map((bucket) => ({
      month: formatLabel(bucket._id, granularity),
      revenue: bucket.revenue,
      orders: bucket.orders,
    }));

    // ── top categories — items actually sold within the range ─
    //    (falls back to catalog-wide counts if no orders have
    //    line items yet, so the chart isn't empty on a fresh store)
    let topCategories = [];
    try {
      const soldAgg = await Order.aggregate([
        { $match: dateMatch },
        { $unwind: "$items" },
        {
          $addFields: {
            "items.productObjId": {
              $cond: [
                { $eq: [{ $type: "$items.productId" }, "objectId"] },
                "$items.productId",
                { $toObjectId: "$items.productId" },
              ],
            },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "items.productObjId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $group: {
            _id: "$product.category",
            count: { $sum: "$items.qty" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]);
      topCategories = soldAgg.map((c) => ({ name: c._id, count: c.count }));
    } catch (aggErr) {
      // e.g. productId isn't a valid ObjectId string in some legacy orders —
      // fall through to the catalog-wide fallback below
      topCategories = [];
    }

    if (topCategories.length === 0) {
      // fallback: static catalog breakdown (e.g. no sales in range yet)
      const catAgg = await Product.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]);
      topCategories = catAgg.map((c) => ({ name: c._id, count: c.count }));
    }

    res.json({
      totalOrders,
      totalProducts,
      totalUsers,
      totalRevenue,
      ordersByStatus,
      monthlyRevenue,
      topCategories,
      range,
      granularity,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAdminStats, getAnalytics };
