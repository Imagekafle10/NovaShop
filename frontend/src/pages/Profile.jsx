import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Profile = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const fetchMyOrders = async () => {
      try {
        const res = await fetch('/api/orders/myorders', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setOrders(Array.isArray(data) ? data : []);
        } else {
          if (res.status === 401) {
            logout();
            navigate('/login');
          }
          setOrders([]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchMyOrders();
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleView = (orderId) => navigate(`/orders/${orderId}`);

  const handleCancel = async (orderId) => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ status: 'Cancelled' })
      });
      const data = await res.json();
      if (res.ok) {
        setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status: 'Cancelled' } : o));
      } else {
        alert(data.message || 'Failed to cancel order');
      }
    } catch (error) {
      console.error(error);
      alert('Something went wrong while cancelling the order');
    }
  };

  if (!user) return null;

  const formatGender = (g) => {
    const map = { male: 'Male', female: 'Female', other: 'Other', prefer_not: 'Prefer not to say' };
    return g ? (map[g] || g) : '—';
  };

  const initials = user.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const statusColor = (status) => {
    if (status === 'Delivered') return { color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
    if (status === 'Shipped')   return { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' };
    if (status === 'Cancelled') return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
    return                             { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
  };

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* Profile card */}
        <div style={s.profileCard}>

          {/* Avatar + name + logout */}
          <div style={s.avatarRow}>
            <div style={s.avatar}>{initials}</div>
            <div style={{ flex: 1 }}>
              <h2 style={s.name}>{user.name}</h2>
              <span style={s.badge}>{user.role.toUpperCase()}</span>
            </div>
            <button onClick={handleLogout} style={s.logoutBtn}>Logout</button>
          </div>

          {/* Divider */}
          <div style={s.divider} />

          {/* Info rows */}
          <div style={s.infoGrid}>
            <InfoRow label="Email"         value={user.email} />
            <InfoRow label="Phone"         value={user.phone || '—'} />
            <InfoRow label="Gender"        value={formatGender(user.gender)} />
          </div>

        </div>

        {/* Order History */}
        <div style={s.section}>
          <h3 style={s.sectionTitle}>Order History  ({orders.length})</h3>

          {loading ? (
            <p style={{ color: '#a1a1aa' }}>Fetching your orders...</p>
          ) : orders.length === 0 ? (
            <div style={s.emptyBox}>
              <p style={{ color: '#a1a1aa', marginBottom: '15px' }}>You haven't placed any orders yet.</p>
              <Link to="/shop" className="btn">Start Shopping</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '14px' }}>
              {orders.map(order => {
                const sc = statusColor(order.status);
                return (
                  <div key={order._id} style={s.orderCard}>

                    <div style={s.orderInfo}>
                      <p style={s.orderMeta}>
                        <span style={s.metaLabel}>Order ID</span>
                        <span style={s.metaValue}>{order._id.slice(-8).toUpperCase()}</span>
                      </p>
                      <p style={s.orderMeta}>
                        <span style={s.metaLabel}>Placed On</span>
                        <span style={s.metaValue}>{new Date(order.createdAt).toLocaleDateString()}</span>
                      </p>
                      <p style={s.orderMeta}>
                        <span style={s.metaLabel}>Total</span>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>Rs {order.totalAmount.toFixed(2)}</span>
                      </p>
                    </div>

                    <span style={{ ...s.statusBadge, background: sc.bg, color: sc.color }}>
                      {order.status}
                    </span>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleView(order._id)}
                        style={s.viewBtn}
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleCancel(order._id)}
                        disabled={order.status !== 'Pending'}
                        title={order.status !== 'Pending' ? 'Only pending orders can be cancelled' : ''}
                        style={{
                          ...s.deleteBtn,
                          opacity: order.status !== 'Pending' ? 0.4 : 1,
                          cursor:  order.status !== 'Pending' ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #27272a' }}>
    <span style={{ color: '#71717a', fontSize: '0.85rem', fontWeight: 600 }}>{label}</span>
    <span style={{ color: '#fff', fontSize: '0.9rem' }}>{value}</span>
  </div>
);

const s = {
  page: {
    minHeight:  '100vh',
    background: 'linear-gradient(180deg, #0b0b0e 0%, #18181b 100%)',
  },
  container: {
    maxWidth: '780px',
    margin:   '0 auto',
    display:  'flex',
    flexDirection: 'column',
    gap:      '20px',
  },
  profileCard: {
    background:   '#18181b',
    border:       '1px solid #27272a',
    borderRadius: '16px',
    padding:      '28px',
  },
  avatarRow: {
    display:     'flex',
    alignItems:  'center',
    gap:         '16px',
    marginBottom:'20px',
    flexWrap:    'wrap',
  },
  avatar: {
    width:           '64px',
    height:          '64px',
    borderRadius:    '50%',
    background:      'linear-gradient(135deg, #f97316, #ea580c)',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    color:           '#fff',
    fontWeight:      'bold',
    fontSize:        '1.4rem',
    flexShrink:      0,
  },
  name: {
    color:        '#fff',
    fontSize:     '1.6rem',
    fontWeight:   800,
    marginBottom: '6px',
  },
  badge: {
    background:  'rgba(249,115,22,0.1)',
    color:       '#f97316',
    padding:     '4px 10px',
    borderRadius:'6px',
    fontSize:    '0.8rem',
    fontWeight:  'bold',
  },
  logoutBtn: {
    background:   'rgba(239,68,68,0.1)',
    color:        '#ef4444',
    border:       '1px solid #ef4444',
    padding:      '10px 20px',
    borderRadius: '10px',
    fontWeight:   'bold',
    fontSize:     '0.9rem',
    cursor:       'pointer',
    marginLeft:   'auto',
  },
  divider: {
    height:       '1px',
    background:   '#27272a',
    marginBottom: '16px',
  },
  infoGrid: {
    display:       'flex',
    flexDirection: 'column',
  },
  section: {
    background:   '#18181b',
    border:       '1px solid #27272a',
    borderRadius: '16px',
    padding:      '10px',
  },
  sectionTitle: {
    color:        '#f97316',
    fontSize:     '1.2rem',
    fontWeight:   'bold',
    marginBottom: '20px',
  },
  emptyBox: {
    background:   '#09090b',
    padding:      '30px',
    borderRadius: '8px',
    textAlign:    'center',
    border:       '1px solid #27272a',
  },
  orderCard: {
    background:    '#09090b',
    border:        '1px solid #27272a',
    borderRadius:  '12px',
    padding:       '16px 20px',
    display:       'flex',
    alignItems:    'center',
    flexWrap:      'wrap',
    gap:           '16px',
    justifyContent:'space-between',
  },
  orderInfo: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '4px',
    flex:          1,
    minWidth:      '180px',
  },
  orderMeta: {
    display:    'flex',
    gap:        '8px',
    alignItems: 'center',
    fontSize:   '0.88rem',
  },
  metaLabel: {
    color:     '#71717a',
    minWidth:  '70px',
  },
  metaValue: {
    color:      '#fff',
    fontWeight: 500,
  },
  statusBadge: {
    padding:      '6px 14px',
    borderRadius: '20px',
    fontWeight:   'bold',
    fontSize:     '0.85rem',
    whiteSpace:   'nowrap',
  },
  viewBtn: {
    background:   'rgba(59,130,246,0.1)',
    color:        '#3b82f6',
    border:       '1px solid #3b82f6',
    padding:      '8px 16px',
    borderRadius: '8px',
    fontWeight:   'bold',
    fontSize:     '0.85rem',
    cursor:       'pointer',
  },
  deleteBtn: {
    background:   'rgba(239,68,68,0.1)',
    color:        '#ef4444',
    border:       '1px solid #ef4444',
    padding:      '8px 16px',
    borderRadius: '8px',
    fontWeight:   'bold',
    fontSize:     '0.85rem',
  },
};

export default Profile;