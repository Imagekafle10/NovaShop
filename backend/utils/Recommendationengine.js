/**
 * Hybrid Recommendation Engine
 * Strategy: User-Based Collaborative Filtering + Jaccard Similarity
 *           + Content-Based (Price Affinity + Title Similarity)
 *
 * Flow:
 * 1. Build current user's purchase profile (products, categories, avg price, title tokens)
 * 2. Find similar users by Jaccard similarity on purchased product sets
 * 3. Collect candidate products bought by similar users (exclude already bought)
 * 4. Score candidates:
 *      CF score (35%) + Rating (20%) + Category Affinity (20%)
 *      + Price Affinity (15%) + Title Similarity (10%)
 * 5. Tie-break by rating
 * 6. Fill remaining slots with category-based fallback sorted by rating
 */

/**
 * Jaccard similarity between two sets
 * Best for binary purchase data (bought / not bought)
 * Formula: |A ∩ B| / |A ∪ B|
 */
const jaccardSimilarity = (setA, setB) => {
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
};

/**
 * Tokenize a product title into a set of lowercase words (basic, no stemming).
 * "Wireless Bluetooth Mouse - Black" -> {"wireless","bluetooth","mouse","black"}
 */
const tokenizeTitle = (title) => {
  if (!title) return new Set();
  return new Set(
    String(title)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1), // drop single letters/noise
  );
};

/**
 * Build purchase profile for one user from their orders
 * Returns: { purchasedIds, categoryWeights, productWeights, avgPrice, titleTokens }
 */
const buildProfile = (orders) => {
  const purchasedIds = new Set();
  const categoryWeights = {}; // { Electronics: 3.5, Books: 1.0 }
  const productWeights = {}; // { productId: 2.0 }
  const titleTokens = new Set(); // union of all tokens from purchased titles

  let priceSum = 0;
  let priceCount = 0;

  orders.forEach((order, orderIndex) => {
    // Recent orders get higher weight (recency decay)
    const recencyWeight = 1 / (orderIndex + 1);

    (order.items || []).forEach((item) => {
      const pid = String(item.productId?._id || item.productId);
      const cat = item.productId?.category;
      const title = item.productId?.name;
      const price = item.productId?.price;
      const qty = (item.qty || 1) * recencyWeight;

      purchasedIds.add(pid);
      productWeights[pid] = (productWeights[pid] || 0) + qty;
      if (cat) categoryWeights[cat] = (categoryWeights[cat] || 0) + qty;

      if (title) {
        tokenizeTitle(title).forEach((tok) => titleTokens.add(tok));
      }

      if (typeof price === "number" && !Number.isNaN(price)) {
        priceSum += price;
        priceCount += 1;
      }
    });
  });

  const avgPrice = priceCount > 0 ? priceSum / priceCount : null;

  return {
    purchasedIds,
    categoryWeights,
    productWeights,
    avgPrice,
    titleTokens,
  };
};

/**
 * Main recommendation function
 *
 * @param {Array}  currentUserOrders  - current user's orders (populated)
 * @param {Array}  allUsersOrders     - all other users' orders (populated)
 * @param {Array}  allProducts        - all in-stock products
 * @param {Number} limit              - how many to return
 */
const getRecommendations = (
  currentUserOrders,
  allUsersOrders,
  allProducts,
  limit = 12,
) => {
  if (!currentUserOrders || currentUserOrders.length === 0) return [];

  const currentProfile = buildProfile(currentUserOrders);
  if (currentProfile.purchasedIds.size === 0) return [];

  // ── Step 1: Group other users' orders by userId ──────────────
  const userOrderMap = {};
  allUsersOrders.forEach((order) => {
    const uid = String(order.userId);
    if (!userOrderMap[uid]) userOrderMap[uid] = [];
    userOrderMap[uid].push(order);
  });

  // ── Step 2: Score each other user by Jaccard similarity ──────
  const userSimilarities = {};
  Object.entries(userOrderMap).forEach(([uid, orders]) => {
    const profile = buildProfile(orders);
    const similarity = jaccardSimilarity(
      currentProfile.purchasedIds,
      profile.purchasedIds,
    );
    if (similarity > 0) {
      userSimilarities[uid] = { similarity, profile };
    }
  });

  // ── Step 3: Collect candidate products from similar users ─────
  const candidateScores = {}; // { productId: cfScore }

  Object.values(userSimilarities).forEach(({ similarity, profile }) => {
    Object.entries(profile.productWeights).forEach(([pid, weight]) => {
      // Skip products current user already bought
      if (currentProfile.purchasedIds.has(pid)) return;
      candidateScores[pid] = (candidateScores[pid] || 0) + similarity * weight;
    });
  });

  // ── Step 4: Normalize CF scores ───────────────────────────────
  const maxCfScore = Math.max(...Object.values(candidateScores), 1);

  // ── Step 5: Category affinity weights ────────────────────────
  const totalCatWeight =
    Object.values(currentProfile.categoryWeights).reduce((a, b) => a + b, 0) ||
    1;

  // ── Step 6: Build product lookup map ─────────────────────────
  const productMap = {};
  allProducts.forEach((p) => {
    productMap[String(p._id)] = p;
  });

  // ── Step 7: Score and rank all candidates ────────────────────
  const scored = Object.entries(candidateScores)
    .map(([pid, cfScore]) => {
      const product = productMap[pid];
      if (!product || product.stock <= 0) return null;

      const normalizedCF = cfScore / maxCfScore;
      const catAffinity =
        (currentProfile.categoryWeights[product.category] || 0) /
        totalCatWeight;
      const ratingBoost = (product.ratings || 0) / 5;

      // Price affinity: 1 = same price as user's average, decays toward 0
      // the further away the candidate's price is (capped at 100% difference).
      let priceAffinity = 0.5; // neutral default when we can't compare
      if (
        currentProfile.avgPrice != null &&
        typeof product.price === "number" &&
        currentProfile.avgPrice > 0
      ) {
        const diffRatio =
          Math.abs(product.price - currentProfile.avgPrice) /
          currentProfile.avgPrice;
        priceAffinity = 1 - Math.min(diffRatio, 1);
      }

      // Title similarity: Jaccard overlap between candidate's title tokens
      // and the union of tokens from everything the user has purchased.
      let titleSimilarity = 0;
      if (currentProfile.titleTokens.size > 0) {
        const productTokens = tokenizeTitle(product.name);
        titleSimilarity = jaccardSimilarity(
          productTokens,
          currentProfile.titleTokens,
        );
      }

      // Final score:
      // CF (35%) + Rating (20%) + Category Affinity (20%)
      // + Price Affinity (15%) + Title Similarity (10%)
      const finalScore =
        normalizedCF * 0.35 +
        ratingBoost * 0.2 +
        catAffinity * 0.2 +
        priceAffinity * 0.15 +
        titleSimilarity * 0.1;

      return { product, score: finalScore };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Primary: final score
      if (Math.abs(b.score - a.score) > 0.01) return b.score - a.score;
      // Tie-break: higher rating wins
      return (b.product.ratings || 0) - (a.product.ratings || 0);
    })
    .slice(0, limit)
    .map((s) => s.product);

  // ── Step 8: Category-based fallback if not enough results ─────
  if (scored.length < limit) {
    const scoredIds = new Set(scored.map((p) => String(p._id)));
    const alreadyBought = currentProfile.purchasedIds;

    const topCategories = Object.entries(currentProfile.categoryWeights)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);

    const fallback = allProducts
      .filter(
        (p) =>
          p.stock > 0 &&
          !scoredIds.has(String(p._id)) &&
          !alreadyBought.has(String(p._id)) &&
          topCategories.includes(p.category),
      )
      .sort((a, b) => (b.ratings || 0) - (a.ratings || 0)) // top rated first
      .slice(0, limit - scored.length);

    return [...scored, ...fallback];
  }

  return scored;
};

module.exports = { getRecommendations };
