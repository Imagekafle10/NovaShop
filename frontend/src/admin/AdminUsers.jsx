import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const AdminUsers = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user]);

  const handleToggleStatus = async (targetUser) => {
    const action = targetUser.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${targetUser.name}?`)) return;

    setUpdatingId(targetUser._id);
    try {
      const res = await fetch(`/api/auth/users/${targetUser._id}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(u => u._id === targetUser._id ? { ...u, isActive: !u.isActive } : u));
      } else {
        alert(data.message || 'Failed to update user status');
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ color: '#f97316', marginBottom: '20px' }}>User Directory</h2>
      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <p style={{ color: '#a1a1aa' }}>Loading users...</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={rowStyle}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>NAME</th>
                <th style={thStyle}>EMAIL</th>
                <th style={thStyle}>ROLE</th>
                <th style={thStyle}>STATUS</th>
                <th style={thStyle}>JOINED</th>
                <th style={thStyle}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isSelf = u._id === user._id;
                const isActive = u.isActive !== false; // treat undefined as active for legacy users
                return (
                  <tr key={u._id} style={rowStyle}>
                    <td style={tdStyle}>{u._id.substring(0, 8)}...</td>
                    <td style={tdStyle}>{u.name}</td>
                    <td style={tdStyle}>{u.email}</td>
                    <td style={tdStyle}>
                      <span style={{ background: u.role === 'admin' ? 'rgba(234,88,12,0.2)' : 'rgba(16,185,129,0.2)', color: u.role === 'admin' ? '#f97316' : '#10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: isActive ? '#10b981' : '#ef4444',
                        padding: '4px 10px', borderRadius: '20px',
                        fontSize: '0.8rem', fontWeight: 'bold',
                      }}>
                        {isActive ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                    <td style={tdStyle}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={isSelf || updatingId === u._id}
                        title={isSelf ? "You can't deactivate your own account" : ''}
                        style={{
                          ...actionBtnStyle,
                          background: isActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          color: isActive ? '#ef4444' : '#10b981',
                          border: `1px solid ${isActive ? '#ef4444' : '#10b981'}`,
                          opacity: (isSelf || updatingId === u._id) ? 0.4 : 1,
                          cursor: (isSelf || updatingId === u._id) ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {updatingId === u._id ? 'Updating...' : isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
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
  padding: '6px 14px',
  borderRadius: '6px',
  fontWeight: 'bold',
  fontSize: '0.8rem',
  cursor: 'pointer',
};

export default AdminUsers;