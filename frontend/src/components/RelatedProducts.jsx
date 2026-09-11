import React, { useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import '../styles/product.css';

const RelatedProducts = ({ productId }) => {
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!productId) return;

    const fetchRelated = async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/products/${productId}/related`);
        const data = await res.json();
        setRelated(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load related products:', error);
        setRelated([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRelated();
    setShowAll(false);
  }, [productId]);

  if (loading || related.length === 0) return null;

  const visible = showAll ? related : related.slice(0, 8);
  const hasMore = related.length > 8;

  return (
    // ✅ FIX: dropped the boxed panel (dark background + border) — Shop's
    // "All Products" / category sections are plain, just a heading over
    // the grid, no card-style container around the whole section.
    <section style={styles.section}>
      {/* ✅ FIX: reuse Shop's exact h3 styling (margin: 0, same size/weight)
          instead of this component's own title style, so headings look
          identical across pages. */}
      <h3 style={styles.title}>You may also like</h3>

      {/* ✅ FIX: shared .product-grid class from product.css — same
          minmax(280px, 1fr) auto-fill columns and 30px gap Shop uses,
          instead of this component's own 4/3/2/1 breakpoint grid. */}
      <div className="product-grid">
        {visible.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>

      {hasMore && (
        <div style={styles.moreWrap}>
          <button onClick={() => setShowAll(prev => !prev)} style={styles.moreBtn}>
            {showAll ? 'Show less' : `See more`}
          </button>
        </div>
      )}
    </section>
  );
};

const styles = {
  section: {
    marginBottom: '20px',
  },
  title: {
    margin:       0,
    marginBottom: '12px',
    color:        '#fff',
    fontSize:     '20px',
    fontWeight:   600,
  },
  moreWrap: {
    display:        'flex',
    justifyContent: 'center',
    marginTop:      '20px',
  },
  moreBtn: {
    background:   'transparent',
    color:        '#f97316',
    border:       '1px solid #f97316',
    padding:      '10px 24px',
    borderRadius: '8px',
    fontWeight:   'bold',
    fontSize:     '0.85rem',
    cursor:       'pointer',
    transition:   'background 0.15s',
  },
};

export default RelatedProducts;