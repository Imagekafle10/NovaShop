import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus } from 'lucide-react';

const AdminCategories = () => {
  const { user }   = useContext(AuthContext);
  const navigate   = useNavigate();
  const [categories, setCategories] = useState([]);
  const [newCat,     setNewCat]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [adding,     setAdding]     = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    fetchCategories();
  }, [user, navigate]);

  const fetchCategories = async () => {
    try {
      const res  = await fetch('/api/categories');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    setAdding(true);
    setError('');
    try {
      const res  = await fetch('/api/categories', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body:    JSON.stringify({ name: newCat.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        setNewCat('');
      } else {
        setError(data.message || 'Failed to add category');
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) {
        setCategories(prev => prev.filter(c => c._id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Failed to delete');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <Link to="/admin/products" style={styles.backLink}>
          <ArrowLeft size={18} /> Back to Products
        </Link>

        {/* Hero */}
        <div style={styles.hero}>
          <div>
            <p style={styles.heroLabel}>Admin</p>
            <h2 style={styles.heroTitle}>Manage Categories</h2>
            <p style={styles.heroSub}>{categories.length} categories in store</p>
          </div>
        </div>

        {/* Add form */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Add New Category</h3>
          {error && <p style={{ color: '#ef4444', marginBottom: 12, fontSize: 14 }}>{error}</p>}
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="e.g. Furniture"
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              style={styles.input}
            />
            <button type="submit" disabled={adding} style={styles.addBtn}>
              <Plus size={16} /> {adding ? 'Adding...' : 'Add Category'}
            </button>
          </form>
        </div>

        {/* Categories list */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>All Categories</h3>
          {loading ? (
            <p style={{ color: '#a1a1aa' }}>Loading...</p>
          ) : categories.length === 0 ? (
            <p style={{ color: '#a1a1aa' }}>No categories yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {categories.map(cat => (
                <div key={cat._id} style={styles.catRow}>
                  <span style={styles.catName}>{cat.name}</span>
                  <button
                    onClick={() => handleDelete(cat._id, cat.name)}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const styles = {
  page:      { minHeight: '100vh', background: 'linear-gradient(180deg, #0b0b0e 0%, #18181b 100%)', padding: '40px 16px' },
  container: { maxWidth: '680px', margin: '0 auto', color: '#fafafa' },
  backLink:  { display: 'flex', alignItems: 'center', gap: '6px', color: '#a1a1aa', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500, marginBottom: '20px' },
  hero:      { background: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '28px', marginBottom: '20px' },
  heroLabel: { color: '#71717a', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' },
  heroTitle: { fontSize: '1.9rem', fontWeight: 800, color: '#fff', marginBottom: '6px' },
  heroSub:   { color: '#a1a1aa', fontSize: '0.9rem' },
  section:   { background: '#18181b', border: '1px solid #27272a', borderRadius: '14px', padding: '24px', marginBottom: '20px' },
  sectionTitle: { color: '#fff', fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '16px' },
  input: {
    flex: 1,
    minWidth: '200px',
    padding: '12px 14px',
    background: '#09090b',
    border: '1px solid #27272a',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
  },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'linear-gradient(135deg, #f97316, #ea580c)',
    color: '#fff', border: 'none', padding: '12px 20px',
    borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem',
    cursor: 'pointer', boxShadow: '0 4px 14px rgba(249,115,22,0.3)',
  },
  catRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#09090b', border: '1px solid #27272a',
    borderRadius: '10px', padding: '14px 16px',
  },
  catName:   { color: '#fff', fontWeight: 600 },
  deleteBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'rgba(239,68,68,0.1)', color: '#ef4444',
    border: '1px solid #ef4444', padding: '7px 14px',
    borderRadius: '8px', fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer',
  },
};

export default AdminCategories;