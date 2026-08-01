import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const OrderHistory = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/orders?status=Delivered,Cancelled', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  const handleView = (id) => {
    navigate(`/orders/${id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    const res = await fetch(`/api/orders/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user.token}` }
    });
    if (res.ok) {
      setOrders(orders.filter(order => order._id !== id));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.message || 'Failed to delete order');
    }
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <Link to="/admin/orders" style={backLinkStyle}>
            <ArrowLeft size={16} /> Back to Manage Orders
          </Link>
          <h2 style={{ color: '#f97316', margin: '10px 0 0' }}>Order History</h2>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <p style={{ color: '#a1a1aa' }}>Loading orders...</p>
        ) : orders.length === 0 ? (
          <p style={{ color: '#a1a1aa', padding: '20px 0' }}>No delivered or cancelled orders yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={rowStyle}>
                <th style={thStyle}>ORDER ID</th>
                <th style={thStyle}>USER</th>
                <th style={thStyle}>TOTAL</th>
                <th style={thStyle}>DATE</th>
                <th style={thStyle}>STATUS</th>
                <th style={thStyle}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order._id} style={rowStyle}>
                  <td style={tdStyle}>{order._id.substring(0, 8)}...</td>
                  <td style={tdStyle}>{order.userId?.name || 'Deleted User'}</td>
                  <td style={tdStyle}>Rs {order.totalAmount.toFixed(2)}</td>
                  <td style={tdStyle}>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    <span style={{
                      ...statusPillStyle,
                      background: order.status === 'Delivered' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                      color: order.status === 'Delivered' ? '#4ade80' : '#ef4444',
                    }}>
                      {order.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleView(order._id)}
                        style={{ ...actionBtnStyle, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid #3b82f6' }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(order._id)}
                        style={{ ...actionBtnStyle, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid #ef4444' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const containerStyle = { maxWidth: '1200px', margin: '40px auto', padding: '30px', background: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', color: '#fafafa' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const rowStyle = { borderBottom: '1px solid rgba(255,255,255,0.1)' };
const thStyle = { padding: '15px', textAlign: 'left', color: '#a1a1aa', fontSize: '0.9rem' };
const tdStyle = { padding: '15px', textAlign: 'left' };
const actionBtnStyle = {
  padding: '6px 12px',
  borderRadius: '6px',
  fontWeight: 'bold',
  fontSize: '0.8rem',
  cursor: 'pointer',
};
const backLinkStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  color: '#a1a1aa', textDecoration: 'none', fontSize: '0.9rem',
};
const statusPillStyle = {
  padding: '5px 12px',
  borderRadius: '20px',
  fontSize: '0.8rem',
  fontWeight: 600,
};

export default OrderHistory;