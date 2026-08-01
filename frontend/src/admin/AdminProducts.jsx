import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const AdminProducts = () => {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) {
        setProducts(products.filter(p => p._id !== id));
      }
    }
  };

  const filteredProducts = products.filter(product => {
    const term = searchTerm.trim().toLowerCase();
    if (term === '') return true;
    const matchesOrderId = product._id?.toLowerCase().includes(term);
    const matchesItemName = product.name?.toLowerCase().includes(term);
    return matchesOrderId || matchesItemName;
  });

  const isFiltering = searchTerm.trim() !== '';

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Hero header */}
        <div style={styles.hero}>
          <div style={styles.heroLeft}>
            <p style={styles.heroLabel}>Admin</p>
            <h2 style={styles.heroTitle}>Manage Products</h2>
            <p style={styles.heroSub}>
              {isFiltering
                ? `${filteredProducts.length} of ${products.length} product${products.length !== 1 ? 's' : ''} match`
                : `${products.length} product${products.length !== 1 ? 's' : ''} in catalog`}
            </p>
            
            {/* Search bar inside hero, below title */}
            <div style={styles.searchBar}>
              <div style={styles.searchField}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search Products..."
                  style={styles.searchInput}
                />
              </div>
              {isFiltering && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={styles.clearBtn}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
         
          <Link to="/admin/add-product" style={styles.addBtn}>
            <Plus size={16} /> Add Product
          </Link>
        </div>

        {/* Table */}
        <div style={styles.section}>
          {loading ? (
            <p style={{ color: '#a1a1aa' }}>Loading products...</p>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ color: '#a1a1aa' }}>No products yet.</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ color: '#a1a1aa' }}>No products match your search.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Price</th>
                    <th style={styles.th}>Discount(%)</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Stock</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <tr
                      key={product._id}
                      style={{
                        ...styles.row,
                        ...(product.stock === 0 ? styles.outOfStockRow : {}),
                      }}
                    >
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} style={styles.thumb} />
                          ) : (
                            <div style={styles.thumbFallback}>
                              {product.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p style={styles.productName}>{product.name}</p>
                            <p style={styles.productId}>{product._id.substring(0, 10)}...</p>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.priceTag}>Rs {product.price.toFixed(2)}</span>
                      </td>
                       <td style={styles.td}>
                        <span style={styles.discountTag}> {product.discount}%</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.categoryPill}>{product.category}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.stockPill,
                          background: product.stock > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        }}>
                          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link to={`/admin/edit-product/${product._id}`} style={styles.editBtn}>
                            <Pencil size={14} /> Edit
                          </Link>
                          <button onClick={() => handleDelete(product._id)} style={styles.deleteBtn}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0b0b0e 0%, #18181b 100%)',
    padding: '10px 16px',
  },
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    color: '#fafafa',
  },
  hero: {
    background: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '20px',
    marginBottom: '24px',
  },
  heroLeft: {
    flex: '1',
    minWidth: '300px',
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
    marginBottom: '8px',
    letterSpacing: '0.5px',
  },
  heroSub: {
    color: '#a1a1aa',
    fontSize: '0.9rem',
    marginBottom: '16px',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '8px',
  },
  searchField: {
    flex: '1',
    minWidth: '200px',
    maxWidth: '400px',
  },
  searchInput: {
    width: '100%',
    background: '#09090b',
    border: '1px solid #404043',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fafafa',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  clearBtn: {
    background: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    border: '1px solid #ef4444',
    padding: '10px 18px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, #f97316, #ea580c)',
    color: '#fff',
    textDecoration: 'none',
    padding: '12px 22px',
    borderRadius: '10px',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    boxShadow: '0 4px 14px rgba(249,115,22,0.3)',
    whiteSpace: 'nowrap',
  },
  section: {
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '14px',
    padding: '10px 22px 22px 22px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '16px 12px',
    textAlign: 'left',
    color: '#71717a',
    fontSize: '0.78rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #27272a',
  },
  row: {
    borderBottom: '1px solid #27272a',
  },
  outOfStockRow: {
    background: 'rgba(175, 40, 40, 0.3)',
    borderLeft: '3px solid #ef4444',
  },
  td: {
    padding: '16px 12px',
    verticalAlign: 'middle',
  },
  thumb: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    objectFit: 'cover',
    flexShrink: 0,
  },
  thumbFallback: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #f97316, #ea580c)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  productName: {
    color: '#fff',
    fontWeight: 600,
    marginBottom: '2px',
  },
  productId: {
    color: '#52525b',
    fontSize: '0.78rem',
    fontFamily: 'monospace',
  },
  priceTag: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  discountTag: {
    background: 'rgba(247, 75, 66, 0.1)',
    color: '#d58272',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  categoryPill: {
    background: 'rgba(59,130,246,0.1)',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  stockPill: {
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  editBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(59,130,246,0.1)',
    color: '#3b82f6',
    border: '1px solid #3b82f6',
    textDecoration: 'none',
    padding: '7px 14px',
    borderRadius: '8px',
    fontSize: '0.82rem',
    fontWeight: 'bold',
  },
  deleteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    border: '1px solid #ef4444',
    padding: '7px 14px',
    borderRadius: '8px',
    fontSize: '0.82rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

export default AdminProducts;