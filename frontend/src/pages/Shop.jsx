import React, { useContext, useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
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
      className="scroll-top-btn"
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
  const [showFilters,    setShowFilters]    = useState(false);

  useEffect(() => {
    const saved = loadFilters(userId);
    if (saved) {
      setSearch(saved.search || '');
      setActiveCategory(saved.activeCategory || 'All');
      setSort(saved.sort || 'newest');
      setMinPrice(saved.minPrice || '');
      setMaxPrice(saved.maxPrice || '');
      setMinRating(saved.minRating || 0);
      setShowFilters(saved.showFilters || false);
    } else {
      setSearch('');
      setActiveCategory('All');
      setSort('newest');
      setMinPrice('');
      setMaxPrice('');
      setMinRating(0);
      setShowFilters(false);
    }
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (!hydrated) return;
    saveFilters(userId, { search, activeCategory, sort, minPrice, maxPrice, minRating, showFilters });
  }, [hydrated, userId, search, activeCategory, sort, minPrice, maxPrice, minRating, showFilters]);

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

      <div className="search-row">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-bar"
        />

        {user && (
          <button
            className={`filter-icon-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(v => !v)}
            aria-label="Filters"
          >
            <Filter size={20} />
          </button>
        )}
      </div>

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

      {user && showFilters && (
        <div className="filter-bar">
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="filter-select"
          >
            {searchResults !== null && (
              <option value="relevance">Relevance</option>
            )}
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className="filter-group">
            <span className="filter-label">Price</span>
            <input
              type="text"
              placeholder="Min"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              className="price-input"
            />
            <span className="price-sep">—</span>
            <input
              type="text"
              placeholder="Max"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              className="price-input"
            />
          </div>

          <div className="filter-group">
            <span className="filter-label">Min Rating</span>
            {[1, 2, 3, 4, 5].map(star => (
              <span
                key={star}
                onClick={() => setMinRating(minRating === star ? 0 : star)}
                className="rating-star"
                style={{ color: star <= minRating ? '#f97316' : '#3f3f46' }}
              >★</span>
            ))}
            {minRating > 0 && <span className="rating-suffix">& up</span>}
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="clear-filters-btn">
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

    </div>
  );
};

export default Shop;