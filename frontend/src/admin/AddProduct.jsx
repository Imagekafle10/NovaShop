import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';

const AddProduct = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', category: '', stock: '', discount: '' });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to load categories', err));
  }, []);

  if (!user || user.role !== 'admin') {
    navigate('/');
    return null;
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) return alert('Please select an image');

    setLoading(true);
    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('price', formData.price);
    data.append('category', formData.category);
    data.append('stock', formData.stock);
    data.append('image', image);
    data.append('discount', formData.discount || 0);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body: data
      });
      const responseData = await res.json();

      if (res.ok) {
        alert('Product created successfully!');
        navigate('/admin/products');
      } else {
        alert(responseData.message || 'Error creating product');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <Link to="/admin/products" style={styles.backLink}>
          <ArrowLeft size={18} /> Back to Products
        </Link>

        <div style={styles.hero}>
          <div>
            <p style={styles.heroLabel}>Admin</p>
            <h2 style={styles.heroTitle}>Add Product</h2>
            <p style={styles.heroSub}>Create a new product listing</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.section}>

          <div style={styles.imageUpload}>
            {preview ? (
              <img src={preview} alt="Preview" style={styles.previewImg} />
            ) : (
              <div style={styles.previewFallback}>
                <Upload size={20} color="#71717a" />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Product Image</label>
              <input type="file" accept="image/*" required onChange={handleImageChange} style={styles.fileInput} />
              <p style={styles.hint}>An image is required.</p>
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Product Name</label>
            <input
              type="text"
              placeholder="e.g. Wireless Headphones"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              placeholder="Describe the product..."
              required
              rows="4"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ ...styles.input, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>Price (Rs)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                max={500000}
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>Discount % <span style={{ color: '#52525b' }}>(optional)</span></label>
              <input type="number" placeholder="0" min="0" max="90"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                style={styles.input} />
            </div>

            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>Stock</label>
              <input
                type="number"
                placeholder="0"
                required
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Category</label>
            <select
              value={formData.category}
              required
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={styles.input}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
            {categories.length === 0 && (
              <p style={styles.hint}>
                No categories yet — <Link to="/admin/categories" style={{ color: '#f97316' }}>add one first</Link>.
              </p>
            )}
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            <Upload size={16} /> {loading ? 'Uploading & Creating...' : 'Upload Product'}
          </button>

        </form>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0b0b0e 0%, #18181b 100%)',
    padding: '40px 16px',
  },
  container: {
    maxWidth: '680px',
    margin: '0 auto',
    color: '#fafafa',
  },
  backLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#a1a1aa',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: 500,
    marginBottom: '20px',
  },
  hero: {
    background: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '28px',
    marginBottom: '20px',
  },
  heroLabel: {
    color: '#71717a',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '6px',
  },
  heroTitle: {
    fontSize: '1.9rem',
    fontWeight: 800,
    color: '#fff',
    marginBottom: '6px',
    letterSpacing: '0.5px',
  },
  heroSub: {
    color: '#a1a1aa',
    fontSize: '0.9rem',
  },
  section: {
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '14px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  imageUpload: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    background: '#09090b',
    border: '1px dashed #f97316',
    borderRadius: '12px',
    padding: '16px',
  },
  previewImg: {
    width: '72px',
    height: '72px',
    borderRadius: '12px',
    objectFit: 'cover',
    flexShrink: 0,
  },
  previewFallback: {
    width: '72px',
    height: '72px',
    borderRadius: '12px',
    background: '#18181b',
    border: '1px solid #27272a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fileInput: {
    color: '#a1a1aa',
    fontSize: '0.85rem',
  },
  hint: {
    color: '#52525b',
    fontSize: '0.78rem',
    marginTop: '6px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  row: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  label: {
    color: '#a1a1aa',
    fontSize: '0.85rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    padding: '12px 14px',
    background: '#09090b',
    border: '1px solid #27272a',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, #f97316, #ea580c)',
    color: '#fff',
    border: 'none',
    padding: '14px',
    borderRadius: '10px',
    fontWeight: 'bold',
    fontSize: '0.95rem',
    cursor: 'pointer',
    marginTop: '8px',
    boxShadow: '0 4px 14px rgba(249,115,22,0.3)',
  },
};

export default AddProduct;