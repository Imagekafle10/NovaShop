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

const cosineSim = (vecA, vecB) => {
  const allTerms = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dot = 0,
    magA = 0,
    magB = 0;
  allTerms.forEach((term) => {
    const a = vecA[term] || 0;
    const b = vecB[term] || 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  });
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

/**
 * Find products most similar to a target using TF-IDF weighted cosine similarity.
 *
 * Ranking priority:
 *   1. Same category  → cosine score gets a +0.5 boost (always ranks above different category)
 *   2. Different category → ranked purely by cosine score
 *
 * Within each group, products are ranked by TF-IDF cosine similarity
 * across name + description + category text.
 *
 * @param {Array}  allProducts     - all product documents
 * @param {string} targetProductId - _id of the product to find related items for
 * @param {number} limit           - max results (default 4)
 * @returns {Array} related products sorted by priority then similarity
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

  return allProducts
    .map((p, i) => {
      const cosineSimilarity = cosineSim(targetVec, vectors[i]);

      // ✅ Category boost: same category gets +0.5 added to score
      // This guarantees same-category products always outrank different-category ones
      // since raw cosine similarity is always between 0 and 1
      const sameCategory =
        (p.category || "").toLowerCase().trim() === targetCat;
      const finalScore = cosineSimilarity + (sameCategory ? 0.5 : 0);

      return { product: p, score: finalScore, sameCategory, cosineSimilarity };
    })
    .filter(
      (s) =>
        s.product._id.toString() !== targetProductId.toString() &&
        s.cosineSimilarity > 0,
    )
    .sort((a, b) => {
      // Same category always before different category
      if (a.sameCategory !== b.sameCategory) return a.sameCategory ? -1 : 1;
      // Within same group, sort by cosine similarity
      return b.cosineSimilarity - a.cosineSimilarity;
    })
    .slice(0, limit)
    .map((s) => s.product);
};

module.exports = { findRelatedProducts };
