import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { History } from 'lucide-react';

const AdminOrders = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/orders?status=Pending,Shipped', {
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

  const updateStatus = async (id, status) => {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      const stillActive = ['Pending', 'Shipped'].includes(status);
      setOrders(prev =>
        stillActive
          ? prev.map(order => order._id === id ? { ...order, status } : order)
          : prev.filter(order => order._id !== id)
      );
    }
  };

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

  const filteredOrders = orders.filter(order => {
    const term = searchTerm.trim().toLowerCase();
    if (term === '') return true;
    const matchesOrderId = order._id?.toLowerCase().includes(term);
    const matchesUserName = order.userId?.name?.toLowerCase().includes(term);
    return matchesOrderId || matchesUserName;
  });

  const isFiltering = searchTerm.trim() !== '';

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ color: '#f97316', margin: 0 }}>Manage Orders</h2>
        <Link to="/admin/orders/history" style={historyBtnStyle}>
          <History size={20} /> Order History
        </Link>
      </div>

      {/* Search bar */}
      <div style={searchBarStyle}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search Orders..."
          style={searchInputStyle}
        />
        {isFiltering && (
          <button onClick={() => setSearchTerm('')} style={clearBtnStyle}>
            Clear
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <p style={{ color: '#a1a1aa' }}>Loading orders...</p>
        ) : orders.length === 0 ? (
          <p style={{ color: '#a1a1aa', padding: '20px 0' }}>No pending or shipped orders.</p>
        ) : filteredOrders.length === 0 ? (
          <p style={{ color: '#a1a1aa', padding: '20px 0' }}>No orders match your search.</p>
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
              {filteredOrders.map(order => (
                <tr key={order._id} style={rowStyle}>
                  <td style={tdStyle}>{order._id.substring(0, 8)}...</td>
                  <td style={tdStyle}>{order.userId?.name || 'Deleted User'}</td>
                  <td style={tdStyle}>Rs {order.totalAmount.toFixed(2)}</td>
                  <td style={tdStyle}>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order._id, e.target.value)}
                      style={{ background: '#09090b', color: '#fff', padding: '6px', border: '1px solid #27272a', borderRadius: '4px', outline: 'none' }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
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
const historyBtnStyle = {
  display: 'flex', alignItems: 'center', gap: '8px',
  padding: '8px 16px', borderRadius: '8px',
  fontSize: '0.85rem', fontWeight: 500,
  background: '#f97316', color: '#f3f3fb',
  border: '1px solid #27272a', textDecoration: 'none',
};
const searchBarStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '20px',
};
const searchInputStyle = {
  width: '420px',
  background: '#09090b',
  border: '1px solid #404043',
  borderRadius: '8px',
  padding: '10px 14px',
  color: '#fafafa',
  fontSize: '0.85rem',
  outline: 'none',
};
const clearBtnStyle = {
  background: 'rgba(239,68,68,0.1)',
  color: '#ef4444',
  border: '1px solid #ef4444',
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '0.8rem',
  fontWeight: 'bold',
  cursor: 'pointer',
};

export default AdminOrders;