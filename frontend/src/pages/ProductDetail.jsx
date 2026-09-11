import React, { useContext, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import '../styles/product.css';
import { AuthContext } from '../context/AuthContext';
import RelatedProducts from '../components/RelatedProducts';
import { getDiscountedPrice } from '../utils/discount';

const Stars = ({ rating, size = 16 }) => (
  <span>
    {[1, 2, 3, 4, 5].map(s => (
      <span key={s} style={{ fontSize: size, color: s <= Math.round(rating) ? '#f97316' : '#3f3f46' }}>★</span>
    ))}
  </span>
);

const ProductDetail = () => {
  const { id }    = useParams();
  const { user }  = useContext(AuthContext);
  const navigate  = useNavigate();

  const [product,    setProduct]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [reviews,    setReviews]    = useState([]);
  const [rating,     setRating]     = useState(5);
  const [hover,      setHover]      = useState(0);
  const [comment,    setComment]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewErr,  setReviewErr]  = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);

  const fetchProduct = async () => {
    const res  = await fetch(`/api/products/${id}`);
    const data = await res.json();
    setProduct(data);
  };

  const fetchReviews = async () => {
    const res  = await fetch(`/api/products/${id}/reviews`);
    const data = await res.json();
    setReviews(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchProduct(), fetchReviews()]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', margin: '100px', color: '#f97316' }}>Loading Product...</div>;
  if (!product) return <div style={{ textAlign: 'center', margin: '100px', color: '#ef4444' }}>Product Not Found</div>;

  const finalPrice  = getDiscountedPrice(product.price, product.discount ?? 0);
  const hasDiscount = (product.discount ?? 0) > 0;

  const handleAddToCart = async () => {
    if (!user) {
      alert('Please login to add items to cart');
      return;
    }
    setAddingToCart(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({
          productId:     product._id,
          name:          product.name,
          price:         finalPrice,
          originalPrice: product.price,
          imageUrl:      product.imageUrl,
          qty: 1,
        }),
      });
      if (res.ok) {
        alert('Successfully added to your cart!');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Failed to add to cart');
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong');
    } finally {
      setAddingToCart(false);
    }
  };

  // ✅ Buy Now — skips cart, goes straight to checkout with this one item
  const handleBuyNow = () => {
    if (!user) {
      alert('Please login to continue');
      navigate('/login');
      return;
    }
    if (product.stock <= 0) {
      alert('This item is out of stock');
      return;
    }
    setBuyingNow(true);
    navigate('/checkout', {
      state: {
        checkoutItems: [{
          productId:     product._id,
          name:          product.name,
          price:         finalPrice,
          originalPrice: product.price,
          imageUrl:      product.imageUrl,
          qty: 1,
        }],
        totalAmount:   finalPrice,
        isSingleItem:  true,
        paidProductId: product._id,
      }
    });
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewErr('');
    setSubmitting(true);
    try {
      const res  = await fetch(`/api/products/${id}/reviews`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body:    JSON.stringify({ rating, comment })
      });
      const data = await res.json();
      if (res.ok) {
        setReviews(prev => [data, ...prev]);
        setComment('');
        setRating(5);
        fetchProduct();
      } else {
        setReviewErr(data.message);
      }
    } catch (err) {
      setReviewErr('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="product-detail-wrapper pd-container">

      {/* ✅ FIX: scoped responsive rules for pieces that previously used
          fixed inline sizes (font sizes, button layout, etc.) and
          didn't scale down for small screens. .product-detail's own
          1-column collapse at 900px (in product.css) already handled
          the big layout switch — this fills in the rest. */}
      <style>{`
        .pd-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        @media (max-width: 480px) {
          .pd-container { padding: 12px; }
        }

        .pd-breadcrumb {
          color: #a1a1aa;
          margin-bottom: 20px;
          font-size: 0.95rem;
          word-break: break-word;
        }

        .pd-title {
          font-size: 2.8rem;
          margin-bottom: 10px;
        }
        @media (max-width: 600px) {
          .pd-title { font-size: 1.9rem; }
        }

        .pd-price {
          font-size: 2.5rem;
          margin: 0;
        }
        @media (max-width: 600px) {
          .pd-price { font-size: 1.9rem; }
        }

        .pd-actions {
          display: flex;
          gap: 12px;
        }
        @media (max-width: 480px) {
          .pd-actions { flex-direction: column; }
        }
        .pd-actions .btn {
          flex: 1;
          padding: 18px;
          font-size: 1.2rem;
        }
        @media (max-width: 480px) {
          .pd-actions .btn { padding: 14px; font-size: 1.05rem; }
        }

        .pd-review-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          flex-wrap: wrap;
          gap: 6px;
        }

        .pd-section-box {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 14px;
          padding: 24px;
        }
        @media (max-width: 480px) {
          .pd-section-box { padding: 14px; border-radius: 10px; }
        }

        .pd-heading {
          color: #fff;
          margin-bottom: 16px;
          font-size: 1.2rem;
        }
        @media (max-width: 480px) {
          .pd-heading { font-size: 1rem; margin-bottom: 10px; }
        }

        .pd-star-input {
          font-size: 32px;
          cursor: pointer;
          user-select: none;
          transition: color 0.15s;
        }
        @media (max-width: 480px) {
          .pd-star-input { font-size: 22px; }
        }

        .pd-textarea {
          width: 100%;
          padding: 12px 14px;
          background: #09090b;
          border: 1px solid #27272a;
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          outline: none;
          resize: vertical;
          font-family: inherit;
          box-sizing: border-box;
        }
        @media (max-width: 480px) {
          .pd-textarea { padding: 9px 11px; font-size: 13px; }
        }

        .pd-review-card {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 12px;
          padding: 18px;
        }
        @media (max-width: 480px) {
          .pd-review-card { padding: 12px; border-radius: 8px; }
        }
        .pd-detail-image {
          width: 100%;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          object-fit: cover;
        }
        @media (max-width: 600px) {
          .pd-detail-image {
            height: 260px;
          }
        }
      `}</style>

      <div className="pd-breadcrumb">
        <Link to="/" style={{ color: '#f97316' }}>Home</Link> /&nbsp;
        <Link to="/shop" style={{ color: '#f97316' }}>Shop</Link> /&nbsp;
        {product.category} / <span style={{ color: '#fff' }}>{product.name}</span>
      </div>

      <div className="product-detail">

        <div className="detail-image-container">
          <img src={product.imageUrl} alt={product.name} className="detail-image pd-detail-image" />
        </div>

        <div className="detail-info">
          <h2 className="pd-title">{product.name}</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <Stars rating={product.ratings} size={20} />
            <span style={{ color: '#f97316', fontWeight: 700 }}>{Number(product.ratings).toFixed(1)}</span>
            <span style={{ color: '#71717a', fontSize: 13 }}>({product.numReviews} review{product.numReviews !== 1 ? 's' : ''})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '15px 0', flexWrap: 'wrap' }}>
            <p className="detail-price pd-price">
              Rs {finalPrice}
            </p>
            {hasDiscount && (
              <>
                <span style={{ color: '#71717a', fontSize: '1.2rem', textDecoration: 'line-through' }}>
                  Rs {product.price}
                </span>
                <span style={{
                  background:   '#ef4444',
                  color:        '#fff',
                  fontSize:     13,
                  fontWeight:   700,
                  padding:      '4px 10px',
                  borderRadius: 8,
                }}>
                  -{product.discount}% OFF
                </span>
              </>
            )}
          </div>

          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ color: '#fff', marginBottom: '10px' }}>Product Description</h4>
            <p style={{ color: '#a1a1aa', lineHeight: '1.8' }}>{product.description}</p>
          </div>

     {user?.role !== 'admin' && (
  <div className="pd-actions">
    <button
      onClick={handleAddToCart}
      disabled={addingToCart}
      className="btn"
      style={{
        opacity: addingToCart ? 0.7 : 1,
        background: 'transparent',
        border: '2px solid #f97316',
        color: '#f97316',
      }}
    >
      {addingToCart ? 'Adding...' : 'Add to Cart'}
    </button>

    <button
      onClick={handleBuyNow}
      disabled={buyingNow || product.stock <= 0}
      className="btn"
      style={{
        opacity: (buyingNow || product.stock <= 0) ? 0.7 : 1,
      }}
    >
      {product.stock <= 0 ? 'Out of Stock' : buyingNow ? 'Redirecting...' : 'Buy Now'}
    </button>
  </div>
)}

          <p style={{ marginTop: '20px', color: product.stock > 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
            {product.stock > 0 ? `● In Stock (${product.stock} units available)` : `● Temporarily Out of Stock`}
          </p>
        </div>
      </div>

      <div style={{ marginTop: 48 }}>

        {user && user.role !== 'admin' && (
          <div className="pd-section-box" style={{ marginBottom: 28 }}>
            <h3 className="pd-heading">Write a Review</h3>

            {reviewErr && (
              <p style={{ color: '#ef4444', marginBottom: 12, fontSize: 14 }}>{reviewErr}</p>
            )}

            <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 8 }}>Your Rating</p>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHover(star)}
                      onMouseLeave={() => setHover(0)}
                      className="pd-star-input"
                      style={{
                        color: star <= (hover || rating) ? '#f97316' : '#3f3f46',
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 8 }}>Your Comment</p>
                <textarea
                  placeholder="Share your experience with this product..."
                  required
                  rows={3}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="pd-textarea"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  alignSelf:    'flex-start',
                  padding:      '11px 24px',
                  background:   submitting ? '#7c3c0e' : 'linear-gradient(135deg,#f97316,#ea580c)',
                  color:        '#fff',
                  border:       'none',
                  borderRadius: 10,
                  fontWeight:   'bold',
                  fontSize:     14,
                  cursor:       submitting ? 'not-allowed' : 'pointer',
                  boxShadow:    '0 4px 14px rgba(249,115,22,0.3)',
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        )}

        {!user && (
          <p style={{ color: '#a1a1aa', marginBottom: 24 }}>
            <Link to="/login" style={{ color: '#f97316' }}>Login</Link> to write a review.
          </p>
        )}

        <h3 className="pd-heading">
          Reviews ({reviews.length})
        </h3>

        {reviews.length === 0 ? (
          <div className="pd-section-box" style={{ textAlign: 'center' }}>
            <p style={{ color: '#a1a1aa' }}>No reviews yet. Be the first to review this product!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviews.map(r => (
              <div key={r._id} className="pd-review-card">
                <div className="pd-review-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width:           36,
                      height:          36,
                      borderRadius:    '50%',
                      background:      'linear-gradient(135deg,#f97316,#ea580c)',
                      display:         'flex',
                      alignItems:      'center',
                      justifyContent:  'center',
                      color:           '#fff',
                      fontWeight:      'bold',
                      fontSize:        14,
                      flexShrink:      0,
                    }}>
                      {r.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ color: '#fff', fontWeight: 600, marginBottom: 2 }}>{r.name}</p>
                      <Stars rating={r.rating} size={13} />
                    </div>
                  </div>
                  <span style={{ color: '#71717a', fontSize: 12 }}>
                    {new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p style={{ color: '#a1a1aa', lineHeight: 1.6, marginTop: 8 }}>{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {user?.role !== 'admin' && <RelatedProducts productId={product._id} />}

    </div>
  );
};

export default ProductDetail;