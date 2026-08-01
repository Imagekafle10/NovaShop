import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import "../styles/product.css";
import ProductCard from "../components/ProductCard";

const ForYou = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate         = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading,         setLoading]         = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }

    const fetchRecommendations = async () => {
      try {
        const res = await fetch("/api/products/foryou", {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        if (!res.ok) {
          if (res.status === 401) { logout(); navigate("/login"); }
          setLoading(false);
          return;
        }

        const data = await res.json();
        setRecommendations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error loading recommendations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [user, navigate, logout]);

  if (!user) return null;

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>✨ For You</h2>
        <p style={styles.subtitle}>
          Personalized picks based on your shopping history
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <p style={styles.muted}>Loading your recommendations...</p>
      ) : recommendations.length === 0 ? (
        <div style={styles.emptyBox}>
          <p style={styles.emptyText}>
            We need a little more order  to personalize your feed!
          </p>
          <Link to="/shop" className="btn">Browse Marketplace</Link>
        </div>
      ) : (
        <div style={styles.grid}>
          {recommendations.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  page: {
    maxWidth:  "1200px",
    margin:    "40px auto",
    padding:   "0 30px",
    color:     "#fafafa",
  },
  header: {
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    paddingBottom: "20px",
    marginBottom:  "30px",
  },
  title: {
    color:        "#fff",
    fontSize:     "2.2rem",
    marginBottom: "8px",
  },
  subtitle: {
    color:    "#a1a1aa",
    fontSize: "1rem",
  },
  muted: {
    color:    "#a1a1aa",
    fontSize: "1.1rem",
  },
  emptyBox: {
    background:   "#18181b",
    padding:      "40px",
    borderRadius: "12px",
    textAlign:    "center",
    border:       "1px solid #27272a",
  },
  emptyText: {
    color:        "#a1a1aa",
    marginBottom: "20px",
    fontSize:     "1.1rem",
  },
  grid: {
    display:             "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap:                 "30px",
    marginTop:           "10px",
  },
};

export default ForYou;