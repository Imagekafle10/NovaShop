import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Field = ({ label, field, placeholder, address, onChange, type = 'text' }) => (
  <div style={fieldWrap}>
    <label style={labelStyle}>{label}</label>
    <input
      type={type}
      style={inputStyle}
      placeholder={placeholder}
      value={address[field]}
      onChange={(e) => onChange(field, e.target.value)}
      required
      onFocus={e => (e.target.style.borderColor = '#f97316')}
      onBlur={e  => (e.target.style.borderColor = '#222')}
    />
  </div>
);

const fieldWrap  = { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 };
const labelStyle = { fontSize: 12, color: '#555', fontWeight: 500 };
const inputStyle = {
  background:   '#0f0f0f',
  border:       '0.5px solid #222',
  borderRadius: 8,
  padding:      '11px 14px',
  fontSize:     14,
  color:        '#e0e0e0',
  outline:      'none',
  transition:   'border-color 0.15s',
  width:        '100%',
  boxSizing:    'border-box',
};

const Checkout = () => {
  const { user }  = useContext(AuthContext);
  const navigate  = useNavigate();
  const location  = useLocation();

  const [address, setAddress] = useState({
    fullName:   user?.name  || '',
    street:     '',
    city:       '',
    postalCode: '',
    phone:      user?.phone || '',
  });
  const [paying,        setPaying]        = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');

  // ✅ Fallback cart fetched from DB when navigating directly (no location.state)
  const [fallbackCart, setFallbackCart] = useState([]);
  const [fallbackLoading, setFallbackLoading] = useState(!location.state?.checkoutItems);

  useEffect(() => {
    if (location.state?.checkoutItems || !user) {
      setFallbackLoading(false);
      return;
    }
    const fetchCart = async () => {
      try {
        const res  = await fetch('/api/cart', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const data = await res.json();
        setFallbackCart(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setFallbackCart([]);
      } finally {
        setFallbackLoading(false);
      }
    };
    fetchCart();
  }, [location.state, user]);

  const checkoutItems = location.state?.checkoutItems ?? fallbackCart;
  const totalPrice    = location.state?.totalAmount ||
    checkoutItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const isSingleItem  = location.state?.isSingleItem  ?? false;
  const paidProductId = location.state?.paidProductId ?? null;

  const shipping = 0;
  const tax      = Math.round(totalPrice * 0.13);
  const grand    = totalPrice + tax + shipping;

  const handleChange = (field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  // ── shared order save ──────────────────────────────────────
  const saveOrder = async (paymentId) => {
    const saveRes = await fetch('/api/orders', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({
        items:       checkoutItems,
        totalAmount: grand,
        address,
        paymentId,
      })
    });
    const saveData = await saveRes.json();
    if (saveRes.ok) {
      // ✅ clear cart via API instead of Redux
      try {
        if (isSingleItem && paidProductId) {
          await fetch(`/api/cart/${paidProductId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${user.token}` }
          });
        } else {
          await fetch('/api/cart/clear', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${user.token}` }
          });
        }
      } catch (err) {
        console.error('Failed to clear cart after order:', err);
        // order still succeeded, so we proceed regardless
      }

      // ✅ pass the real saved order (falling back to what we sent, in case
      // the API only returns { message } on success) so OrderSuccess can
      // show accurate details instead of placeholders
      const savedOrder = saveData?.order || saveData?._id
        ? saveData.order || saveData
        : { _id: paymentId, totalAmount: grand, items: checkoutItems, address, paymentMethod, createdAt: new Date().toISOString() };

      navigate('/ordersuccess', {
        state: {
          orderDetails: {
            ...savedOrder,
            paymentMethod,
          },
        },
      });
    } else {
      alert('Order saving failed: ' + saveData.message);
    }
  };

  // ── COD flow ───────────────────────────────────────────────
  const handleCOD = async () => {
    setPaying(true);
    try {
      await saveOrder('COD_' + Date.now());
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  // ── Razorpay flow ──────────────────────────────────────────
  const handleRazorpay = async () => {
    setPaying(true);
    try {
      const orderRes = await fetch('/api/payment/order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ amount: grand })
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) { alert('Payment initialization failed.'); setPaying(false); return; }

      const options = {
        key:         process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount:      orderData.amount,
        currency:    orderData.currency,
        name:        process.env.REACT_APP_ORGANIZATION_NAME,
        description: 'Order Payment',
        order_id:    orderData.id,
        handler: async (response) => {
          const verifyRes = await fetch('/api/payment/verify', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(response)
          });
          if (verifyRes.ok) {
            await saveOrder(response.razorpay_payment_id);
          } else {
            alert('Payment verification failed');
          }
          setPaying(false);
        },
        modal:   { ondismiss: () => setPaying(false) },
        prefill: {
          name:    address.fullName,
          email:   user?.email  || '',
          contact: address.phone || '',
        },
        theme: { color: '#f97316' }
      };
      new window.Razorpay(options).open();
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
      setPaying(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user) { alert('Please login first'); navigate('/login'); return; }
    const { fullName, street, city, postalCode, phone } = address;
    if (!fullName || !street || !city || !postalCode || !phone) {
      alert('Please fill in all shipping details');
      return;
    }
    if (checkoutItems.length === 0) {
      alert('Your cart is empty');
      return;
    }
    if (paymentMethod === 'cod') handleCOD();
    else handleRazorpay();
  };

  const s = {
    page:             { minHeight: '100vh', background: '#0a0a0a', padding: '40px 20px', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#f1f1f1' },
    inner:            { maxWidth: 960, margin: '0 auto' },
    breadcrumb:       { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#555', marginBottom: 32 },
    breadcrumbActive: { color: '#f97316' },
    heading:          { fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px', marginBottom: 28, color: '#f1f1f1' },
    grid:             { display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' },
    formCard:         { background: '#111', border: '0.5px solid #1f1f1f', borderRadius: 14, padding: '28px' },
    sectionLabel:     { fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#444', marginBottom: 16 },
    row2:             { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    summaryCard:      { background: '#111', border: '0.5px solid #1f1f1f', borderRadius: 14, padding: '24px', position: 'sticky', top: 24 },
    itemRow:          { display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: '0.5px solid #1a1a1a' },
    itemImg:          { width: 48, height: 48, borderRadius: 8, objectFit: 'cover', background: '#1a1a1a', flexShrink: 0 },
    itemName:         { fontSize: 13, color: '#e0e0e0', fontWeight: 500, marginBottom: 2 },
    itemMeta:         { fontSize: 12, color: '#555' },
    itemAmt:          { fontSize: 13, color: '#f1f1f1', fontWeight: 500, marginLeft: 'auto', flexShrink: 0, textAlign: 'right' },
    divider:          { height: '0.5px', background: '#1a1a1a', margin: '4px 0 16px' },
    totalRow:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    totalLabel:       { fontSize: 13, color: '#666' },
    totalValue:       { fontSize: 13, color: '#c4c4c4' },
    grandLabel:       { fontSize: 15, fontWeight: 600, color: '#f1f1f1' },
    grandValue:       { fontSize: 18, fontWeight: 600, color: '#f97316' },
    payBtn: {
      width: '100%', padding: '14px', marginTop: 20,
      background:    paying ? '#7c3c0e' : '#f97316',
      color:         '#fff', border: 'none', borderRadius: 10,
      fontSize:      15, fontWeight: 600,
      cursor:        paying ? 'not-allowed' : 'pointer',
      letterSpacing: '-0.2px', transition: 'background 0.15s',
    },
    secureNote: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, fontSize: 12, color: '#444' },
  };

  const radioStyle = (active, color = '#f97316') => ({
    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
    border:     `2px solid ${active ? color : '#333'}`,
    background: active ? color : 'transparent',
    transition: 'all 0.15s',
  });

  const optionStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
    cursor:     'pointer',
    background: active ? 'rgba(249,115,22,0.08)' : '#0d0d0d',
    transition: 'background 0.15s',
  });

  if (fallbackLoading) {
    return <div style={{ textAlign: 'center', margin: '100px', color: '#f97316' }}>Loading Checkout...</div>;
  }

  return (
    <div style={s.page}>
      <div style={s.inner}>

        <div style={s.breadcrumb}>
          <span>Cart</span><span>›</span>
          <span style={s.breadcrumbActive}>Checkout</span>
          <span>›</span><span>Confirmation</span>
        </div>

        <h2 style={s.heading}>Checkout</h2>

        <form onSubmit={handleSubmit}>
          <div style={s.grid}>

            {/* ── Left: shipping + payment method ── */}
            <div style={s.formCard}>
              <div style={s.sectionLabel}>Shipping details</div>

              <Field label="Full name"      field="fullName"   placeholder="Enter your name"     address={address} onChange={handleChange} />
              <Field label="Street address" field="street"     placeholder="Enter street address" address={address} onChange={handleChange} />
              <div style={s.row2}>
                <Field label="City"        field="city"       placeholder="Enter your city"      address={address} onChange={handleChange} />
                <Field label="Postal code" field="postalCode" placeholder="400001"               address={address} onChange={handleChange} />
              </div>
              <Field label="Phone" field="phone" placeholder="+977 9800000000" type="tel" address={address} onChange={handleChange} />

              {user?.name && (
                <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
                  ✓ Name autofilled from your account
                </p>
              )}

              {/* Payment method selector */}
              <div style={{ marginTop: 24 }}>
                <div style={s.sectionLabel}>Payment method</div>
                <div style={{ borderRadius: 10, overflow: 'hidden', border: '0.5px solid #1a1a1a' }}>

                  {/* Razorpay */}
                  <div
                    style={{ ...optionStyle(paymentMethod === 'razorpay'), borderBottom: '0.5px solid #1a1a1a' }}
                    onClick={() => setPaymentMethod('razorpay')}
                  >
                    <div style={radioStyle(paymentMethod === 'razorpay')} />
                    <div>
                      <div style={{ fontSize: 13, color: '#ccc', fontWeight: 500 }}>Pay Online</div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>UPI · Cards · Net Banking via Razorpay</div>
                    </div>
                    <span style={{
                      marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 4,
                      background: 'rgba(249,115,22,0.15)', color: '#f97316',
                    }}>RZP</span>
                  </div>

                  {/* COD */}
                  <div
                    style={{ ...optionStyle(paymentMethod === 'cod') }}
                    onClick={() => setPaymentMethod('cod')}
                  >
                    <div style={radioStyle(paymentMethod === 'cod', '#4ade80')} />
                    <div>
                      <div style={{ fontSize: 13, color: '#ccc', fontWeight: 500 }}>Cash on Delivery</div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Pay when your order arrives</div>
                    </div>
                    <span style={{
                      marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 4,
                      background: 'rgba(74,222,128,0.1)', color: '#4ade80',
                    }}>COD</span>
                  </div>

                </div>
              </div>
            </div>

            {/* ── Right: order summary ── */}
            <div style={s.summaryCard}>
              <div style={s.sectionLabel}>Order summary</div>

              {checkoutItems.length === 0 ? (
                <p style={{ color: '#a1a1aa', fontSize: 13 }}>Your cart is empty.</p>
              ) : checkoutItems.map(item => {
                const hasDiscount = item.originalPrice && item.originalPrice > item.price;
                return (
                  <div key={item.productId} style={s.itemRow}>
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={s.itemImg}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...s.itemName, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </div>
                      {hasDiscount && (
                        <span style={{
                          display: 'inline-block', background: '#ef4444', color: '#fff',
                          fontSize: 10, fontWeight: 700, padding: '2px 6px',
                          borderRadius: 4, marginBottom: 4,
                        }}>
                          {Math.round((1 - item.price / item.originalPrice) * 100)}% OFF
                        </span>
                      )}
                      <div style={s.itemMeta}>Qty: {item.qty}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 12, color: '#e0e0e0', fontWeight: 500 }}>
                          Rs {item.price.toFixed(2)} each
                        </span>
                        {hasDiscount && (
                          <span style={{ fontSize: 11, color: '#555', textDecoration: 'line-through' }}>
                            Rs {item.originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={s.itemAmt}>Rs {(item.price * item.qty).toFixed(2)}</div>
                  </div>
                );
              })}

              <div style={s.totalRow}>
                <span style={s.totalLabel}>Subtotal</span>
                <span style={s.totalValue}>Rs {totalPrice.toFixed(2)}</span>
              </div>
              <div style={s.totalRow}>
                <span style={s.totalLabel}>VAT (13%)</span>
                <span style={s.totalValue}>Rs {tax.toFixed(2)}</span>
              </div>
              <div style={s.totalRow}>
                <span style={s.totalLabel}>Shipping</span>
                <span style={{ ...s.totalValue, color: '#4ade80' }}>Free</span>
              </div>

              <div style={s.divider} />

              <div style={s.totalRow}>
                <span style={s.grandLabel}>Total</span>
                <span style={s.grandValue}>Rs {grand.toFixed(2)}</span>
              </div>

              <button type="submit" style={s.payBtn} disabled={paying || checkoutItems.length === 0}>
                {paying
                  ? 'Processing...'
                  : paymentMethod === 'cod'
                  ? `Place Order · Rs ${grand.toFixed(2)}`
                  : `Pay Rs ${grand.toFixed(2)}`}
              </button>

              {paymentMethod === 'cod' && !paying && (
                <p style={{ fontSize: 12, color: '#555', textAlign: 'center', marginTop: 10 }}>
                  You will pay Rs {grand.toFixed(2)} cash when your order arrives.
                </p>
              )}

              <div style={s.secureNote}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                256-bit SSL encrypted checkout
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;