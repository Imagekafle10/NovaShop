import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import '../styles/product.css';
import { AuthContext } from '../context/AuthContext';
import { getDiscountedPrice } from '../utils/discount';

const Stars = ({ rating }) => (
  <span>
    {[1, 2, 3, 4, 5].map(s => (
      <span key={s} style={{ fontSize: 14, color: s <= Math.round(rating) ? '#f97316' : '#3f3f46' }}>
        ★
      </span>
    ))}
  </span>
);

const ProductCard = ({ product }) => {
  const { user } = useContext(AuthContext);

  const finalPrice  = getDiscountedPrice(product.price, product.discount ?? 0);
  const hasDiscount = (product.discount ?? 0) > 0;

  return (
    // ✅ FIX 1: position: relative so the absolute badge is anchored here
    <div className="product-card" style={{ position: 'relative' }}>
      <img src={product.imageUrl} alt={product.name} className="product-image" />

      {/* Discount badge */}
      {hasDiscount && (
        <span style={{
          position:     'absolute',
          top:          8,
          right:         8,
          background:   '#ef4444',
          color:        '#fff',
          fontSize:     15,
          fontWeight:   700,
          padding:      '3px 8px',
          borderRadius: 6,
        }}>
          -{product.discount}%
        </span>
      )}

      <div className="product-info">
        <h3>{product.name}</h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 8px' }}>
          <Stars rating={product.ratings || 0} />
          <span style={{ fontSize: 12, color: '#71717a' }}>
            ({product.numReviews || 0})
          </span>
        </div>

        {/* ✅ FIX 2: Show finalPrice, with strikethrough original if discounted */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
          <p className="price" style={{ margin: 0 }}>Rs {finalPrice}</p>
          {hasDiscount && (
            <span style={{ color: '#71717a', fontSize: 13, textDecoration: 'line-through' }}>
              Rs {product.price}
            </span>
          )}
        </div>

        {user
          ? <Link to={`/product/${product._id}`} className="btn">View Details</Link>
          : <Link to="/login" className="btn">View</Link>
        }
      </div>
    </div>
  );
};

export default ProductCard;