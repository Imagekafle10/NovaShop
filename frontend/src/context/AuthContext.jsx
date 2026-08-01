import React, { createContext, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { initCart } from '../redux/cartSlice';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();

  const [user, setUser] = useState(
    localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : null
  );

  // Load the correct cart on initial app load
  useEffect(() => {
    dispatch(initCart(user?._id ?? null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('userInfo', JSON.stringify(userData));
    dispatch(initCart(userData._id));
  };

  // const logout = () => {
  //   setUser(null);
  //   localStorage.removeItem('userInfo');
  //   dispatch(initCart(null));
  // };

  const logout = () => {
  const userId = user?._id || user?.id;

  // Remove saved shop filters
  if (userId) {
    sessionStorage.removeItem(`shopFilters_${userId}`);
  }

  setUser(null);
  localStorage.removeItem('userInfo');
  dispatch(initCart(null));
};

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};