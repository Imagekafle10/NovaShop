// utils/cosineSimilarity.js
// Used for: product search (query vs product text)

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

const cosineSim = (tfA, tfB) => {
  const allTerms = new Set([...Object.keys(tfA), ...Object.keys(tfB)]);
  let dot = 0,
    magA = 0,
    magB = 0;
  allTerms.forEach((term) => {
    const a = tfA[term] || 0;
    const b = tfB[term] || 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  });
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

/**
 * Search products using substring match + cosine similarity ranking.
 * Substring matches always appear first, then ranked by cosine score.
 *
 * @param {Array}  products  - array of product documents
 * @param {string} query     - search query string
 * @param {number} threshold - minimum cosine score to include (default 0.05)
 * @returns {Array} filtered and ranked products
 */
const searchProducts = (products, query, threshold = 0.05) => {
  const q = query.trim().toLowerCase();
  if (!q) return products;

  const queryTF = termFrequency(tokenize(q));

  const scored = products.map((p) => {
    const text =
      `${p.name} ${p.description || ""} ${p.category || ""}`.toLowerCase();
    const isSubstringMatch = text.includes(q);
    const productTF = termFrequency(tokenize(text));
    const score = cosineSim(queryTF, productTF);
    return { product: p, score, isSubstringMatch };
  });

  return scored
    .filter((s) => s.isSubstringMatch || s.score > threshold)
    .sort((a, b) => {
      if (a.isSubstringMatch !== b.isSubstringMatch)
        return a.isSubstringMatch ? -1 : 1;
      return b.score - a.score;
    })
    .map((s) => s.product);
};

module.exports = { searchProducts };
