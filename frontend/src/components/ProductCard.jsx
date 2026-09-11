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
  const destination = user ? `/product/${product._id}` : '/login';
  const unitsSold   = product.sold ?? product.unitsSold ?? 0;

  return (
    <Link
      to={destination}
      className="product-card"
      style={{ position: 'relative', textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
    >
      <img src={product.imageUrl} alt={product.name} className="product-image" />

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

        {/* Price — e.g. Rs.123 */}
       <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
  <p className="price" style={{ margin: 0 }}>
    <span className="currency">Rs.</span>{finalPrice}
  </p>
  {hasDiscount && (
    <span className="original-price">
      <span >Rs.</span>{product.price}
    </span>
  )}
</div>

        {/* Rating + reviews */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0' }}>
          <Stars rating={product.ratings || 0} />
          <span style={{ fontSize: 12, color: '#71717a' }}>
            ({product.numReviews || 0})
          </span>
          <span style={{ fontSize: 12, color: '#71717a' }}>
            {unitsSold} sold
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;