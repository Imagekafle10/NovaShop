const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

// ── Business timezone used for bucketing/labeling dates.
//    Without this, MongoDB's $dateToString buckets in UTC while the
//    JS Date logic below (startDate calc, label formatting) uses the
//    server's local timezone — causing days/hours to be split or
//    mislabeled whenever the server isn't running in UTC.
const TZ = "Asia/Kathmandu";

// ── Revenue filter:
//    Online payments  → count always (payment already collected)
//    COD              → count ONLY when Delivered
//
// ✅ FIX: the old { paymentId: { $not: /^COD_/ } } silently matched
// orders where paymentId is missing/null entirely (regex doesn't match
// undefined, so $not flipped it to "matches"), inflating revenue with
// orders that were never actually paid for online. We now require
// paymentId to exist and be a non-COD string.
const REVENUE_FILTER = {
  $or: [
    // Online payment — must actually have a paymentId, and it must not be COD
    {
      paymentId: { $exists: true, $ne: null, $not: /^COD_/ },
    },
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
//    short display label appropriate for its granularity.
//    ✅ FIX: bucketKey is produced by Mongo using the TZ timezone
//    (see $dateToString calls below), so we parse/format it as that
//    same timezone here — not as an ambiguous local-time string — or
//    the displayed label drifts by the UTC offset.
const formatLabel = (bucketKey, granularity) => {
  if (granularity === "hour") {
    // bucketKey is "YYYY-MM-DD HH:00" already expressed in TZ.
    // Format the hour portion directly — no re-parsing/timezone
    // conversion needed since Mongo already gave us the TZ-local hour.
    const [, timePart] = bucketKey.split(" ");
    const [hourStr] = timePart.split(":");
    const hour = Number(hourStr);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour} ${period}`;
  }
  if (granularity === "day") {
    const [year, month, day] = bucketKey.split("-").map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  // month → "2026-07" => "Jul '26"
  const [year, month] = bucketKey.split("-");
  const d = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return (
    d.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" }) +
    " '" +
    year.slice(2)
  );
};

const getAdminStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments({});
    const totalProducts = await Product.countDocuments({});
    const totalUsers = await User.countDocuments({ role: "user" });

    // ✅ FIX: sum revenue in the aggregation pipeline instead of pulling
    // every matching order into memory with .find() and reducing in JS —
    // same REVENUE_FILTER, but scales properly as order volume grows.
    const revenueAgg = await Order.aggregate([
      { $match: REVENUE_FILTER },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total ?? 0;

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

    // ✅ FIX: revenue filter no longer silently includes orders with
    // a missing paymentId (see REVENUE_FILTER above)
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

    // ── orders by status — scoped to the selected range ───────
    // ✅ FIX: null/undefined status values used to collapse into a
    // literal "undefined" key and vanish from the frontend silently.
    // Now they're bucketed under an explicit "unknown" key so they're
    // visible instead of disappearing.
    const statusAgg = await Order.aggregate([
      { $match: dateMatch },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const ordersByStatus = {};
    statusAgg.forEach((s) => {
      const key = s._id ? String(s._id).toLowerCase() : "unknown";
      ordersByStatus[key] = (ordersByStatus[key] || 0) + s.count;
    });

    // ── revenue over time — range-based, adaptive granularity ─
    // ✅ FIX: bucket in TZ explicitly instead of Mongo's default UTC,
    // so buckets line up with the same calendar days/hours the user
    // actually sees, and match formatLabel's assumptions above.
    const revenueMatchStage = { ...REVENUE_FILTER, ...dateMatch };

    const series = await Order.aggregate([
      { $match: revenueMatchStage },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: "$createdAt",
              timezone: TZ,
            },
          },
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

    // ── top categories — units actually sold from DELIVERED orders,
    //    within the selected range ONLY. No catalog fallback: if
    //    nothing was delivered in this period, the chart should show
    //    that honestly (empty), not silently swap in total catalog
    //    counts that have nothing to do with the selected period.
    let topCategories = [];

    try {
      const soldAgg = await Order.aggregate([
        // Only count units that were actually delivered,
        // not every order placed in the range (Pending/Cancelled excluded)
        { $match: { ...dateMatch, status: "Delivered" } },
        { $unwind: "$items" },
        {
          $addFields: {
            // ✅ FIX: $convert with onError/onNull instead of $cond +
            // $toObjectId. The old $toObjectId threw for the ENTIRE
            // aggregation the moment one legacy order had a non-ObjectId
            // productId. $convert handles it per-document — bad rows
            // become null and get dropped below, instead of torching
            // every other valid order's data too.
            "items.productObjId": {
              $convert: {
                input: "$items.productId",
                to: "objectId",
                onError: null,
                onNull: null,
              },
            },
          },
        },
        // Drop line items whose productId couldn't be converted
        { $match: { "items.productObjId": { $ne: null } } },
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
            // NOTE: confirm this matches your actual order-item schema
            // field name (some codebases use "quantity" instead of "qty").
            // If it's wrong, this silently sums undefined as 0 instead
            // of throwing, and every category comes back with count: 0.
            count: { $sum: "$items.qty" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]);

      topCategories = soldAgg.map((c) => ({ name: c._id, count: c.count }));
    } catch (aggErr) {
      // ✅ FIX: log instead of swallowing, so this failure mode is
      // actually visible in production instead of an invisible fallback.
      console.error("topCategories sales aggregation failed:", aggErr);
      topCategories = [];
    }

    // No fallback here on purpose — an empty topCategories array means
    // "nothing delivered in this period," and the frontend should show
    // that as an empty state (see AdminDashboard's "No revenue data for
    // this period" pattern), not paper over it with unrelated catalog data.

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
