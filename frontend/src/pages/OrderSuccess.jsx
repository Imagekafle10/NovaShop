import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, Mail, ShieldCheck, ShoppingBag, Copy, Check, MapPin, Bell } from 'lucide-react';

const OrderSuccess = () => {
  const location = useLocation();

  const orderData = location.state?.orderDetails || {};
  const orderId = orderData._id || 'ORD-123456';
  const items = Array.isArray(orderData.items) ? orderData.items : [];
  const paymentMethod = orderData.paymentMethod || 'razorpay';
  const isCOD = paymentMethod === 'cod';

  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 100);
  }, []);

  const handleCopy = () => {
    navigator.clipboard?.writeText(orderId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const s = {
    page: {
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '30px 20px',
      fontFamily: "'DM Sans', system-ui",
      color: '#fff',
    },

    card: {
      width: '100%',
      maxWidth: '560px',
      background: '#111',
      border: '1px solid #222',
      borderRadius: '20px',
      padding: '35px',
      textAlign: 'center',
      boxShadow: '0 20px 60px rgba(0,0,0,.5)',
      opacity: show ? 1 : 0,
      transform: show ? 'translateY(0)' : 'translateY(30px)',
      transition: 'all .5s',
    },

    icon: {
      width: 90,
      height: 90,
      margin: '0 auto 20px',
      borderRadius: '50%',
      background: 'rgba(34,197,94,.1)',
      border: '2px solid #22c55e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },

    title: {
      fontSize: 28,
      fontWeight: 700,
      marginBottom: 8,
    },

    subtitle: {
      color: '#888',
      fontSize: 14,
      lineHeight: 1.6,
    },

    status: {
      marginTop: 25,
      background: 'rgba(249,115,22,.1)',
      border: '1px solid rgba(249,115,22,.3)',
      borderRadius: 12,
      padding: 15,
      textAlign: 'left',
    },

    row: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      fontSize: 14,
    },

    label: {
      color: '#777',
    },

    value: {
      color: '#fff',
      fontWeight: 600,
    },

    copyBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      background: 'transparent',
      border: 'none',
      color: copied ? '#22c55e' : '#777',
      fontSize: 12,
      cursor: 'pointer',
      padding: 0,
    },

    itemsBox: {
      marginTop: 25,
      background: '#0d0d0d',
      border: '1px solid #222',
      borderRadius: 14,
      padding: '18px 20px',
      textAlign: 'left',
    },

    itemsHeader: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.6px',
      textTransform: 'uppercase',
      color: '#666',
      marginBottom: 14,
    },

    itemRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      paddingBottom: 12,
      marginBottom: 12,
      borderBottom: '0.5px solid #1a1a1a',
    },

    itemImg: {
      width: 40,
      height: 40,
      borderRadius: 8,
      objectFit: 'cover',
      background: '#1a1a1a',
      flexShrink: 0,
    },

    itemName: {
      fontSize: 13,
      color: '#e0e0e0',
      fontWeight: 500,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },

    itemMeta: {
      fontSize: 11,
      color: '#555',
      marginTop: 2,
    },

    itemAmt: {
      fontSize: 13,
      color: '#f1f1f1',
      fontWeight: 500,
      marginLeft: 'auto',
      flexShrink: 0,
    },

    addressBox: {
      marginTop: 25,
      background: '#0d0d0d',
      border: '1px solid #222',
      borderRadius: 14,
      padding: '16px 20px',
      textAlign: 'left',
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
    },

    notifyBox: {
      marginTop: 25,
      background: '#0d0d0d',
      border: '1px solid #222',
      borderRadius: 14,
      padding: '18px 20px',
      textAlign: 'left',
      display: 'flex',
      gap: 12,
      alignItems: 'center',
    },

    notifyIcon: {
      width: 35,
      height: 35,
      borderRadius: '50%',
      background: 'rgba(249,115,22,.15)',
      color: '#f97316',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },

    btns: {
      display: 'flex',
      gap: 12,
      marginTop: 25,
    },

    btn: {
      flex: 1,
      padding: '13px',
      borderRadius: 10,
      textDecoration: 'none',
      fontWeight: 600,
      fontSize: 14,
    },
  };

  return (
    <div style={s.page}>

      <div style={s.card}>

        <div style={s.icon}>
          <CheckCircle size={48} color="#22c55e" />
        </div>

        <h1 style={s.title}>Order Placed Successfully </h1>

        <p style={s.subtitle}>
          Thank you for shopping with us.
          Your order has been confirmed and will be processed soon.
        </p>

        <div style={s.status}>

          <div style={s.row}>
            <span style={s.label}>Order ID</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={s.value}>#{orderId.substring(0, 12)}</span>
              <button onClick={handleCopy} style={s.copyBtn} title="Copy order ID">
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </span>
          </div>

          <div style={s.row}>
            <span style={s.label}>Payment</span>
            <span style={{ ...s.value, color: '#22c55e' }}>
              {isCOD ? 'Cash on Delivery' : 'Paid Online'}
            </span>
          </div>

          <div style={{ ...s.row, marginBottom: 0 }}>
            <span style={s.label}>Amount {isCOD ? 'Due' : 'Paid'}</span>
            <span style={{ ...s.value, color: '#f97316' }}>
              Rs {orderData.totalAmount?.toFixed(2) || '0.00'}
            </span>
          </div>

        </div>

        {items.length > 0 && (
          <div style={s.itemsBox}>
            <div style={s.itemsHeader}>{items.length} item{items.length !== 1 ? 's' : ''} ordered</div>
            {items.map((item, idx) => (
              <div
                key={item.productId || idx}
                style={{
                  ...s.itemRow,
                  ...(idx === items.length - 1 ? { marginBottom: 0, paddingBottom: 0, borderBottom: 'none' } : {}),
                }}
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={s.itemImg}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.itemName}>{item.name}</div>
                  <div style={s.itemMeta}>Qty: {item.qty}</div>
                </div>
                <div style={s.itemAmt}>Rs {(item.price * item.qty).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}

        {orderData.address && (
          <div style={s.addressBox}>
            <MapPin size={16} color="#f97316" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0', marginBottom: 2 }}>
                {orderData.address.fullName}
              </div>
              <div style={{ fontSize: 12, color: '#777', lineHeight: 1.5 }}>
                {orderData.address.street}, {orderData.address.city} {orderData.address.postalCode}
              </div>
            </div>
          </div>
        )}

        <div style={s.notifyBox}>
          <div style={s.notifyIcon}>
            <Bell size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0', marginBottom: 2 }}>
              Order placed
            </div>
            <div style={{ fontSize: 12, color: '#777', lineHeight: 1.5 }}>
              You'll be notified about further updates through email or notification.
            </div>
          </div>
        </div>

        <div style={{
          marginTop: 20,
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          color: '#666',
          fontSize: 12,
        }}>
          <ShieldCheck size={14} />
          Secure encrypted transaction
        </div>

        <div style={s.btns}>

          <Link
            to="/profile"
            style={{
              ...s.btn,
              background: '#181818',
              color: '#fff',
              border: '1px solid #333',
            }}
          >
            View Order
          </Link>

          <Link
            to="/shop"
            style={{
              ...s.btn,
              background: '#f97316',
              color: '#fff',
            }}
          >
            <ShoppingBag
              size={15}
              style={{ verticalAlign: 'middle', marginRight: 5 }}
            />
            Shop More
          </Link>

        </div>

      </div>

    </div>
  );
};

export default OrderSuccess;