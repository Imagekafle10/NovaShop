import React, { useContext, useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard';
import '../styles/product.css';
import { AuthContext } from '../context/AuthContext';
import { getDiscountedPrice } from '../utils/discount';

const SORT_OPTIONS = [
  { value: 'newest',      label: 'Newest First' },
  { value: 'oldest',      label: 'Oldest First' },
  { value: 'price_low',   label: 'Price: Low to High' },
  { value: 'price_high',  label: 'Price: High to Low' },
  { value: 'rating_high', label: 'Top Rated' },
];

const applySort = (list, sort) => {
  const arr = [...list];
  switch (sort) {
    case 'newest':      return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case 'oldest':      return arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    case 'price_low':   return arr.sort((a, b) => getDiscountedPrice(a.price, a.discount ?? 0) - getDiscountedPrice(b.price, b.discount ?? 0));
    case 'price_high':  return arr.sort((a, b) => getDiscountedPrice(b.price, b.discount ?? 0) - getDiscountedPrice(a.price, a.discount ?? 0));
    case 'rating_high': return arr.sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
    default:            return arr;
  }
};

const getFilterKey = (userId) => `shopFilters_${userId || 'guest'}`;

const loadFilters = (userId) => {
  try {
    const saved = sessionStorage.getItem(getFilterKey(userId));
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
};
const saveFilters = (userId, filters) => {
  try { sessionStorage.setItem(getFilterKey(userId), JSON.stringify(filters)); }
  catch {}
};

// --- Scroll to top button ---
const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      style={styles.scrollTopBtn}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#fb923c'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#f97316'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    </button>
  );
};

const Shop = () => {
  const { user } = useContext(AuthContext);
  const userId = user?._id || user?.id;

  const [products,       setProducts]       = useState([]);
  const [latestProducts, setLatestProducts] = useState([]);
  const [searchResults,  setSearchResults]  = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [searchLoading,  setSearchLoading]  = useState(false);
  const [categories,     setCategories]     = useState(['All']);

  const [search,         setSearch]         = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sort,           setSort]           = useState('newest');
  const [minPrice,       setMinPrice]       = useState('');
  const [maxPrice,       setMaxPrice]       = useState('');
  const [minRating,      setMinRating]      = useState(0);
  const [hydrated,       setHydrated]       = useState(false);

  useEffect(() => {
    const saved = loadFilters(userId);
    if (saved) {
      setSearch(saved.search || '');
      setActiveCategory(saved.activeCategory || 'All');
      setSort(saved.sort || 'newest');
      setMinPrice(saved.minPrice || '');
      setMaxPrice(saved.maxPrice || '');
      setMinRating(saved.minRating || 0);
    } else {
      setSearch('');
      setActiveCategory('All');
      setSort('newest');
      setMinPrice('');
      setMaxPrice('');
      setMinRating(0);
    }
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (!hydrated) return;
    saveFilters(userId, { search, activeCategory, sort, minPrice, maxPrice, minRating });
  }, [hydrated, userId, search, activeCategory, sort, minPrice, maxPrice, minRating]);

  useEffect(() => {
    fetch('/api/products?latest=true')
      .then(r => r.json())
      .then(setLatestProducts)
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => {
        const names = Array.isArray(data) ? data.map(c => c.name) : [];
        setCategories(['All', ...names]);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setLoading(true);
    const url = activeCategory === 'All'
      ? '/api/products'
      : `/api/products?category=${activeCategory}`;
    fetch(url)
      .then(r => r.json())
      .then(data => { setProducts(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [activeCategory, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (!search.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const category = activeCategory !== 'All' ? `&category=${activeCategory}` : '';
        const res  = await fetch(`/api/products/search?q=${encodeURIComponent(search.trim())}${category}`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search, activeCategory, hydrated]);

  let displayProducts = searchResults !== null ? searchResults : products;

  if (minPrice  !== '') displayProducts = displayProducts.filter(p => getDiscountedPrice(p.price, p.discount ?? 0) >= Number(minPrice));
  if (maxPrice  !== '') displayProducts = displayProducts.filter(p => getDiscountedPrice(p.price, p.discount ?? 0) <= Number(maxPrice));
  if (minRating >   0)  displayProducts = displayProducts.filter(p => (p.ratings || 0) >= minRating);

  if (sort !== 'relevance') displayProducts = applySort(displayProducts, sort);

  const isFiltering = search.trim() !== '' || minPrice !== '' || maxPrice !== '' || minRating > 0 || sort !== 'newest';
  const hasFilters  = minPrice !== '' || maxPrice !== '' || minRating > 0 || sort !== 'newest';

  const clearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setMinRating(0);
    setSort('newest');
  };

  return (
    <div className="shop-container">

      <input
        type="text"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-bar"
      />

      <div className="category-tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {user && (
        <div style={styles.filterBar}>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={styles.select}
          >
            {searchResults !== null && (
              <option value="relevance">Relevance</option>
            )}
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Price</span>
            <input
              type="text"
              placeholder="Min"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              style={styles.priceInput}
            />
            <span style={{ color: '#71717a' }}>—</span>
            <input
              type="text"
              placeholder="Max"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              style={styles.priceInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Min Rating</span>
            {[1, 2, 3, 4, 5].map(star => (
              <span
                key={star}
                onClick={() => setMinRating(minRating === star ? 0 : star)}
                style={{
                  fontSize:   20,
                  cursor:     'pointer',
                  color:      star <= minRating ? '#f97316' : '#3f3f46',
                  transition: 'color 0.15s',
                  userSelect: 'none',
                }}
              >★</span>
            ))}
            {minRating > 0 && <span style={{ color: '#71717a', fontSize: 12 }}>& up</span>}
          </div>

          {hasFilters && (
            <button onClick={clearFilters} style={styles.clearBtn}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {activeCategory === 'All' && !isFiltering && (
        <section className="latest-section">
          <h3>Latest Products</h3>
          <div className="product-grid product-grid-3">
            {latestProducts.slice(0, 3).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>
            {search
              ? `Results for "${search}"`
              : activeCategory === 'All' ? 'All Products' : activeCategory}
          </h3>
          <span style={{ color: '#71717a', fontSize: 13 }}>
            {searchLoading ? 'Searching...' : `${displayProducts.length} product${displayProducts.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {loading || searchLoading ? (
          <div className="loading">Loading...</div>
        ) : displayProducts.length === 0 ? (
          <div className="no-products">No products match your filters.</div>
        ) : (
          <div className="product-grid">
            {displayProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>

      <ScrollToTopButton />
    </div>
  );
};

const styles = {
  filterBar: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap',
    gap: 30, padding: '12px 40px',
    background: '#2b2b2e', border: '1px solid #27272a',
    borderRadius: 12, marginBottom: 24,
  },
  select: {
    background: '#09090b', border: '1px solid #27272a',
    borderRadius: 8, color: '#fff',
    padding: '8px 20px', fontSize: 13,
    outline: 'none', cursor: 'pointer',
  },
  filterGroup: { display: 'flex', alignItems: 'center', gap: 6 },
  filterLabel: { color: '#fff', fontSize: 12, fontWeight: 500, marginRight: 2 },
  priceInput: {
    width: 120, background: '#09090b',
    border: '1px solid #27272a', borderRadius: 8,
    color: '#fff', padding: '7px 12px',
    fontSize: 13, outline: 'none',
  },
  clearBtn: {
    background: 'red', border: '1px solid #3f3f46',
    borderRadius: 8, color: 'white',
    padding: '7px 14px', fontSize: 12,
    cursor: 'pointer', marginLeft: 'auto',
  },
  scrollTopBtn: {
    position: 'fixed',
    bottom: 32,
    right: 32,
    width: 46,
    height: 46,
    borderRadius: '50%',
    background: '#f97316',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
    transition: 'background 0.2s, transform 0.2s',
    zIndex: 999,
  },
};

export default Shop;