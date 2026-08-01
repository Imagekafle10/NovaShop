import { createSlice } from "@reduxjs/toolkit";

const getCartKey = (userId) => `cartItems_${userId || "guest"}`;

const loadCart = (userId) => {
  const saved = localStorage.getItem(getCartKey(userId));
  return saved ? JSON.parse(saved) : [];
};

const initialState = {
  cartItems: [],
  userId: null,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    initCart: (state, action) => {
      const userId = action.payload;
      state.userId = userId;
      state.cartItems = loadCart(userId);
    },
    addToCart: (state, action) => {
      const item = action.payload;
      const existItem = state.cartItems.find(
        (x) => x.productId === item.productId,
      );
      if (existItem) {
        state.cartItems = state.cartItems.map((x) =>
          x.productId === existItem.productId ? item : x,
        );
      } else {
        state.cartItems.push(item);
      }
      localStorage.setItem(
        getCartKey(state.userId),
        JSON.stringify(state.cartItems),
      );
    },
    removeFromCart: (state, action) => {
      state.cartItems = state.cartItems.filter(
        (x) => x.productId !== action.payload,
      );
      localStorage.setItem(
        getCartKey(state.userId),
        JSON.stringify(state.cartItems),
      );
    },
    clearCart: (state) => {
      state.cartItems = [];
      localStorage.removeItem(getCartKey(state.userId));
    },
  },
});

export const { initCart, addToCart, removeFromCart, clearCart } =
  cartSlice.actions;
export default cartSlice.reducer;
