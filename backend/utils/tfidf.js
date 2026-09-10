// utils/tfidf.js

const tokenize = (text) =>
  (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const termFrequency = (tokens) => {
  const tf = {};
  tokens.forEach((t) => {
    tf[t] = (tf[t] || 0) + 1;
  });
  return tf;
};

const computeIDF = (documents) => {
  const idf = {};
  const N = documents.length;
  documents.forEach((tokens) => {
    const seen = new Set(tokens);
    seen.forEach((term) => {
      idf[term] = (idf[term] || 0) + 1;
    });
  });
  Object.keys(idf).forEach((term) => {
    idf[term] = Math.log(N / (1 + idf[term])) + 1;
  });
  return idf;
};

const tfidfVector = (tf, idf) => {
  const vec = {};
  Object.keys(tf).forEach((term) => {
    vec[term] = tf[term] * (idf[term] || 1);
  });
  return vec;
};

// ✅ Pure TF-IDF overlap score: sum of shared-term TF-IDF weight products.
// No cosine normalization (no dividing by vector magnitude) — just raw
// dot-product-style overlap between the target and candidate's TF-IDF vectors.
const tfidfOverlapScore = (vecA, vecB) => {
  let score = 0;
  Object.keys(vecA).forEach((term) => {
    if (vecB[term]) {
      score += vecA[term] * vecB[term];
    }
  });
  return score;
};

/**
 * Find products most similar to a target using pure TF-IDF overlap scoring
 * (no cosine similarity/normalization), blended with rating and popularity signals.
 *
 * Ranking priority:
 *   1. Same category  → score gets a boost so same-category products rank first
 *   2. Different category → ranked purely by TF-IDF overlap score
 *
 * Within each group, products are ranked by a blended score:
 *   - Raw TF-IDF overlap across name + description + category text (primary signal)
 *   - Rating boost: higher-rated products get a bonus (secondary signal)
 *   - Popularity boost: more-purchased products get a bonus (secondary signal)
 *
 * Since raw TF-IDF overlap scores are unbounded (unlike cosine similarity's 0–1 range),
 * the score is normalized against the max overlap score in the candidate set before
 * rating/popularity boosts are applied, so those boosts remain meaningfully proportioned.
 *
 * @param {Array}  allProducts     - all product documents (each optionally carrying
 *                                   a `purchaseCount` field attached by the caller)
 * @param {string} targetProductId - _id of the product to find related items for
 * @param {number} limit           - max results (default 4)
 * @returns {Array} related products sorted by priority then blended score
 */
const findRelatedProducts = (allProducts, targetProductId, limit = 4) => {
  const targetIndex = allProducts.findIndex(
    (p) => p._id.toString() === targetProductId.toString(),
  );
  if (targetIndex === -1) return [];

  const target = allProducts[targetIndex];
  const targetCat = (target.category || "").toLowerCase().trim();

  // Build TF-IDF vectors for all products
  const texts = allProducts.map(
    (p) => `${p.name} ${p.description || ""} ${p.category || ""}`,
  );
  const tokenSets = texts.map(tokenize);
  const idf = computeIDF(tokenSets);
  const vectors = tokenSets.map((tokens) =>
    tfidfVector(termFrequency(tokens), idf),
  );

  const targetVec = vectors[targetIndex];

  // Raw overlap scores for every candidate against the target
  const rawScores = allProducts.map((p, i) =>
    tfidfOverlapScore(targetVec, vectors[i]),
  );
  const maxRawScore = Math.max(1, ...rawScores);

  // Normalize purchaseCount across the candidate set for a proportioned boost
  const maxPurchaseCount = Math.max(
    1,
    ...allProducts.map((p) => p.purchaseCount || 0),
  );

  return allProducts
    .map((p, i) => {
      // Normalize raw TF-IDF overlap to a 0–1 range relative to this candidate set
      const relevanceScore = rawScores[i] / maxRawScore;

      const sameCategory =
        (p.category || "").toLowerCase().trim() === targetCat;

      const ratingBoost = ((p.ratings || 0) / 5) * 0.15;
      const popularityBoost =
        ((p.purchaseCount || 0) / maxPurchaseCount) * 0.15;

      const finalScore =
        relevanceScore +
        (sameCategory ? 0.5 : 0) +
        ratingBoost +
        popularityBoost;

      return {
        product: p,
        score: finalScore,
        sameCategory,
        relevanceScore,
        rawScore: rawScores[i],
      };
    })
    .filter(
      (s) =>
        s.product._id.toString() !== targetProductId.toString() &&
        s.rawScore > 0,
    )
    .sort((a, b) => {
      if (a.sameCategory !== b.sameCategory) return a.sameCategory ? -1 : 1;
      return b.score - a.score;
    })
    .slice(0, limit)
    .map((s) => s.product);
};

module.exports = { findRelatedProducts };
