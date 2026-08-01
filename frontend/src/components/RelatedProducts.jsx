import React, { useEffect, useState } from 'react';
import ProductCard from './ProductCard';

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
    <div style={styles.section}>
      <style>{`
        .related-products-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        @media (max-width: 900px) {
          .related-products-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 640px) {
          .related-products-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 400px) {
          .related-products-grid {
            grid-template-columns: repeat(1, 1fr);
             
          }
        }
      `}</style>

      <h3 style={styles.title}>You may also like</h3>
      <div className="related-products-grid">
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
    </div>
  );
};

const styles = {
  section: {
    background:   '#18181b',
    border:       '1px solid #27272a',
    borderRadius: '14px',
    // padding:      '5px',
    marginBottom: '20px',
  },
  title: {
    color:        '#fff',
    fontSize:     '1.05rem',
    fontWeight:   'bold',
    marginBottom: '16px',
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