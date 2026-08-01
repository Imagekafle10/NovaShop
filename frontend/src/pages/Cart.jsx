import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/cart.css';

const Cart = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [stockMap,  setStockMap]  = useState({});

  const fetchCart = async () => {
    try {
      const res  = await fetch('/api/cart', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      setCartItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchCart();
  }, [user]);

  useEffect(() => {
    const fetchStocks = async () => {
      const entries = await Promise.all(
        cartItems.map(async (item) => {
          try {
            const res = await fetch(`/api/products/${item.productId}`);
            const data = await res.json();
            return [item.productId, data.stock ?? 0];
          } catch {
            return [item.productId, 0];
          }
        })
      );
      setStockMap(Object.fromEntries(entries));
    };
    if (cartItems.length > 0) fetchStocks();
  }, [cartItems]);

  const handleRemove = async (productId) => {
    try {
      const res = await fetch(`/api/cart/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (res.ok) setCartItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateQty = async (item, qty) => {
    const available = stockMap[item.productId];
    if (qty <= 0) {
      handleRemove(item.productId);
      return;
    }
    if (available !== undefined && qty > available) {
      alert(`Only ${available} in stock`);
      return;
    }
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ ...item, qty }),
      });
      const data = await res.json();
      if (res.ok) setCartItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const totalPrice = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const totalSaved = cartItems.reduce((acc, item) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      return acc + (item.originalPrice - item.price) * item.qty;
    }
    return acc;
  }, 0);

  const handleItemCheckout = (item) => {
    const available = stockMap[item.productId];
    if (available !== undefined && available <= 0) {
      alert('This item is out of stock');
      return;
    }
    navigate('/checkout', {
      state: {
        checkoutItems: [item],
        totalAmount:   item.price * item.qty,
        isSingleItem:  true,
        paidProductId: item.productId,
      }
    });
  };

  const handleCheckoutAll = () => {
    const outOfStockItems = cartItems.filter((item) => {
      const available = stockMap[item.productId];
      return available !== undefined && available <= 0;
    });
    if (outOfStockItems.length > 0) {
      alert(`Remove out-of-stock items before checkout: ${outOfStockItems.map(i => i.name).join(', ')}`);
      return;
    }
    navigate('/checkout', {
      state: {
        checkoutItems: cartItems,
        totalAmount:   totalPrice,
        isSingleItem:  false,
      }
    });
  };

  const hasOutOfStockItems = cartItems.some((item) => {
    const available = stockMap[item.productId];
    return available !== undefined && available <= 0;
  });

  if (loading) return <div style={{ textAlign: 'center', margin: '100px', color: '#f97316' }}>Loading Cart...</div>;

  return (
    <div className="cart-container">
      <h2>Shopping Cart</h2>

      {cartItems.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '60px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🛒</div>
          <h3 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '8px' }}>
            Your cart is empty
          </h3>
          <p style={{ color: '#a1a1aa', fontSize: '1rem', marginBottom: '24px' }}>
            Looks like you haven't added anything yet.
          </p>
          <Link to="/shop" className="btn">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="cart-layout">

          <div className="cart-items">
            {cartItems.map((item) => {
              const available = stockMap[item.productId];
              const maxed = available !== undefined && item.qty >= available;
              const outOfStock = available !== undefined && available <= 0;
              const hasDiscount = item.originalPrice && item.originalPrice > item.price;

              return (
                <div key={item.productId} className="cart-item">
                  <img src={item.imageUrl} alt={item.name} className="cart-item-image" />

                  <div className="cart-item-details">
                    <h4>{item.name}</h4>

                    {hasDiscount && (
                      <span style={{
                        display: 'inline-block', background: '#ef4444', color: '#fff',
                        fontSize: 10, fontWeight: 700, padding: '2px 6px',
                        borderRadius: 4, marginBottom: 4,
                      }}>
                        {Math.round((1 - item.price / item.originalPrice) * 100)}% OFF
                      </span>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p className="item-price" style={{ margin: 0 }}>Rs{item.price}</p>
                      {hasDiscount && (
                        <span style={{ fontSize: 12, color: '#71717a', textDecoration: 'line-through' }}>
                          Rs{item.originalPrice}
                        </span>
                      )}
                    </div>

                    <div className="qty-controls">
                      <button onClick={() => handleUpdateQty(item, item.qty - 1)}>-</button>
                      <span>{item.qty}</span>
                      <button
                        onClick={() => handleUpdateQty(item, item.qty + 1)}
                        disabled={maxed || outOfStock}
                      >
                        +
                      </button>
                    </div>

                    {outOfStock ? (
                      <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>
                        Out of stock
                      </p>
                    ) : maxed && (
                      <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>
                        Max stock reached ({available} available)
                      </p>
                    )}

                    <p className="item-subtotal">
                      Subtotal: Rs{(item.price * item.qty).toFixed(2)}
                    </p>

                    <div className="item-actions">
                      <button
                        onClick={() => handleItemCheckout(item)}
                        className="btn btn-checkout-item"
                        disabled={outOfStock}
                        style={outOfStock ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                      >
                        {outOfStock ? 'Out of stock' : 'Buy now'}
                      </button>
                      <button
                        onClick={() => handleRemove(item.productId)}
                        className="btn-remove"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <h3>Total: Rs{totalPrice.toFixed(2)}</h3>
            {/* {totalSaved > 0 && (
              <p style={{ color: '#10b981', fontSize: '0.85rem', marginTop: 4 }}>
                You're saving Rs{totalSaved.toFixed(2)} 🎉
              </p>
            )} */}
            <p className="summary-count">{cartItems.length} item{cartItems.length > 1 ? 's' : ''} in cart</p>
            <button
              onClick={handleCheckoutAll}
              className="btn btn-checkout"
              disabled={hasOutOfStockItems}
              style={hasOutOfStockItems ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              Checkout all
            </button>
            {hasOutOfStockItems && (
              <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '8px' }}>
                Remove out-of-stock items to checkout
              </p>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default Cart;