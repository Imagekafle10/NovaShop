import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    if (!user || user.role !== 'user') { setCartCount(0); return; }
    const fetchCartCount = async () => {
      try {
        const res  = await fetch('/api/cart', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const data = await res.json();
        const items = Array.isArray(data) ? data : [];
        setCartCount(items.reduce((sum, item) => sum + (item.qty || 1), 0));
      } catch (err) {
        console.error('Failed to load cart count:', err);
      }
    };
    fetchCartCount();
  }, [user, location.pathname]); // ✅ refetch on every route change

  useEffect(() => {
    if (!user || user.role !== 'admin') { setOrderCount(0); return; }
    const fetchOrderCount = async () => {
      try {
        const res = await fetch('/api/orders?status=Pending,Shipped', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const data = await res.json();
        const orders = Array.isArray(data) ? data : [];
        setOrderCount(orders.length);
      } catch (err) {
        console.error('Failed to load order count:', err);
      }
    };
    fetchOrderCount();
  }, [user, location.pathname]); // ✅ refetch on every route change

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/shop">
          <img src="/ShopNestLogo.png" alt="ShopNest" style={{ height: '36px', width: '36px', borderRadius: '8px', objectFit: 'cover', filter: 'drop-shadow(0 2px 8px rgba(249, 115, 22, 0.35))' }} />
          {process.env.REACT_APP_ORGANIZATION_NAME}
        </Link>
      </div>
      <ul className="navbar-links">
        <li><Link to="/shop">Shop</Link></li>

        {user ? (
          <>
              {user.role === 'user' &&
              <>
              <li><Link to="/foryou">ForYou!</Link></li>
              <li><Link to="/cart">Cart ({cartCount})</Link></li>
                <li><Link to="/profile">Hi, {user.name}</Link></li>
              </>}
            {user.role === 'admin' &&
            <>
            <li>
              <Link to="/admin">Admin</Link>
            </li>
             <Link to="/admin/products">Products</Link>
             <Link to="/admin/orders">Orders ({orderCount})</Link>
            </>}
            <li><button onClick={handleLogout} className="btn-logout">Logout</button></li>
          </>
        ) : (<>
          <li><Link to="/login">Login</Link></li>
          <li><Link to="/register">Register</Link></li>
        </>)}
      </ul>
    </nav>
  );
};

export default Navbar;