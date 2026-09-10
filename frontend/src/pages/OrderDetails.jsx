import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useParams, useNavigate, Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import { ArrowLeft, Download, MapPin, Calendar, Package, CheckCircle2, Truck, Clock, Trash2, Loader2 } from 'lucide-react';
import RelatedProducts from '../components/RelatedProducts';

const OrderDetails = () => {
  const { id }       = useParams();
  const { user }     = useContext(AuthContext);
  const navigate     = useNavigate();
  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    const fetchOrder = async () => {
      try {
        const res  = await fetch(`/api/orders/${id}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setOrder(data);
        } else {
          if (res.status === 401) navigate('/login');
          setOrder(null);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, user, navigate]);

  const handleDownloadPDF = () => {
    if (!order) return;
    const doc       = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y           = 20;

    // Header band
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(`${process.env.REACT_APP_ORGANIZATION_NAME}`, 14, 18);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text('Order Invoice', 14, 27);

    doc.setTextColor(0, 0, 0);
    y = 48;

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');   doc.text('Order ID:',   14, y);
    doc.setFont(undefined, 'normal'); doc.text(`${order._id}`, 45, y); y += 7;

    doc.setFont(undefined, 'bold');   doc.text('Placed On:',  14, y);
    doc.setFont(undefined, 'normal'); doc.text(`${new Date(order.createdAt).toLocaleString()}`, 45, y); y += 7;

    doc.setFont(undefined, 'bold');   doc.text('Status:',     14, y);
    doc.setFont(undefined, 'normal'); doc.text(`${order.status}`, 45, y); y += 7;

    doc.setFont(undefined, 'bold');   doc.text('Payment:',    14, y);
    doc.setFont(undefined, 'normal');
    doc.text(
      order.paymentId?.startsWith('COD_')
        ? 'Cash on Delivery'
        : `Online - ${order.paymentId || '-'}`,
      45, y
    );
    y += 7;

    doc.setFont(undefined, 'bold');   doc.text('Payment ID:', 14, y);
    doc.setFont(undefined, 'normal'); doc.text(`${order.paymentId || '-'}`, 45, y); y += 14;

    // Address box
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(14, y, pageWidth - 28, 32, 2, 2, 'FD');
    doc.setFont(undefined, 'bold');   doc.text('Shipping Address', 18, y + 8);
    doc.setFont(undefined, 'normal');
    doc.text(`${order.address?.fullName || ''}`,                                18, y + 15);
    doc.text(`${order.address?.street || ''}, ${order.address?.city || ''}`,    18, y + 21);
    doc.text(`${order.address?.postalCode || ''}, ${order.address?.phone || ''}`, 18, y + 27);
    y += 42;

    // Items table
    doc.setFont(undefined, 'bold'); doc.text('Items', 14, y); y += 8;

    doc.setFillColor(249, 115, 22);
    doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('Product', 18, y);
    doc.text('Qty',     112, y);
    doc.text('Price',   142, y);
    doc.text('Subtotal',172, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    doc.setFont(undefined, 'normal');
    (order.items || []).forEach((item, idx) => {
      const product  = item.productId || {};
      const name     = product.name || item.name || 'Item';
      const qty      = item.qty || item.quantity || 1;
      const price    = item.price || product.price || 0;
      const subtotal = qty * price;

      if (idx % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
      }
      doc.text(String(name).substring(0, 40), 18, y);
      doc.text(String(qty),                   112, y);
      doc.text(`Rs ${Number(price).toFixed(2)}`,    142, y);
      doc.text(`Rs ${Number(subtotal).toFixed(2)}`, 172, y);
      y += 8;
      if (y > 250) { doc.addPage(); y = 20; }
    });

    y += 6;
    doc.setDrawColor(230, 230, 230);
    doc.line(14, y, pageWidth - 14, y);
    y += 12;

    // ── Pricing breakdown: Original → Discount → Subtotal → VAT → Total ──
    const itemsSubtotal = (order.items || []).reduce((sum, item) => {
      const product = item.productId || {};
      const price   = item.price || product.price || 0;
      const qty     = item.qty || item.quantity || 1;
      return sum + price * qty;
    }, 0);

    const originalTotal = (order.items || []).reduce((sum, item) => {
      const product       = item.productId || {};
      const originalPrice = item.originalPrice || product.price || item.price || 0;
      const qty           = item.qty || 1;
      return sum + originalPrice * qty;
    }, 0);

    const discountSaved = originalTotal - itemsSubtotal;
    const vatAmount = Number(order.totalAmount) - itemsSubtotal;

    if (y > 220) { doc.addPage(); y = 20; }

    const rowHeight = 9;
    const rows = [
      ...(discountSaved > 0 ? [
        { label: 'Original Price', value: `Rs ${originalTotal.toFixed(2)}`, color: [80, 80, 80] },
        { label: 'Discount',       value: `- Rs ${discountSaved.toFixed(2)}`, color: [16, 185, 129] },
      ] : []),
      { label: 'Subtotal', value: `Rs ${itemsSubtotal.toFixed(2)}`, color: [80, 80, 80] },
      { label: 'VAT (13%)', value: `Rs ${vatAmount.toFixed(2)}`, color: [80, 80, 80] },
    ];

    const boxWidth  = 100;
    const boxHeight = rows.length * rowHeight + 24;
    const boxX      = pageWidth - 14 - boxWidth;

    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(boxX, y, boxWidth, boxHeight, 2, 2, 'FD');

    let rowY = y + 10;

    doc.setFontSize(10);
    rows.forEach(row => {
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...row.color);
      doc.text(row.label, boxX + 8, rowY);
      doc.text(row.value, boxX + boxWidth - 8, rowY, { align: 'right' });
      rowY += rowHeight;
    });

    doc.setDrawColor(220, 220, 220);
    doc.line(boxX + 8, rowY - 2, boxX + boxWidth - 8, rowY - 2);
    rowY += 9;

    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(249, 115, 22);
    doc.text('Total', boxX + 8, rowY);
    doc.text(`Rs ${Number(order.totalAmount).toFixed(2)}`, boxX + boxWidth - 8, rowY, { align: 'right' });

    y = y + boxHeight + 15;

    doc.setTextColor(150, 150, 150);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Thank you for shopping with ${process.env.REACT_APP_ORGANIZATION_NAME}`, pageWidth / 2, 285, { align: 'center' });

    doc.save(`order-${order._id}.pdf`);
  };

  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(`Change order status to "${newStatus}"?`)) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order._id}/status`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body:    JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrder(prev => ({ ...prev, status: updated.status }));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error(error);
      alert('Something went wrong while updating the status');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Regular users can only cancel a Pending order (matches backend rules in
  // updateOrderStatus). Admins get the real delete flow below.
  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order._id}/status`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body:    JSON.stringify({ status: 'Cancelled' })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrder(prev => ({ ...prev, status: updated.status }));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Failed to cancel order');
      }
    } catch (error) {
      console.error(error);
      alert('Something went wrong while cancelling the order');
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      const res = await fetch(`/api/orders/${order._id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) {
        navigate('/profile');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Failed to delete order');
      }
    } catch (error) {
      console.error(error);
      alert('Something went wrong while deleting the order');
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.skeletonBlock} />
          <div style={{ ...styles.skeletonBlock, height: '120px' }} />
          <div style={{ ...styles.skeletonBlock, height: '200px' }} />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.container, textAlign: 'center', padding: '60px 30px' }}>
          <Package size={48} color="#3f3f46" style={{ marginBottom: '16px' }} />
          <p style={{ color: '#a1a1aa', fontSize: '1.1rem', marginBottom: '20px' }}>
            We couldn't find this order.
          </p>
        </div>
      </div>
    );
  }

  const statusConfig = {
    Delivered: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle2 },
    Shipped:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: Truck },
    Pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: Clock },
    Cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  icon: Trash2 },
  };
  const sc         = statusConfig[order.status] || statusConfig.Pending;
  const StatusIcon = sc.icon;
  const isCOD      = order.paymentId?.startsWith('COD_');

  const originalTotal = (order.items || []).reduce((sum, item) => {
    const product       = item.productId || {};
    const originalPrice = item.originalPrice || product.price || item.price || 0;
    const qty           = item.qty || 1;
    return sum + originalPrice * qty;
  }, 0);
  const savedAmount = originalTotal - Number(order.totalAmount);

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Top bar */}
        <div style={styles.topBar}>
          {user.role !== "admin" ? (
            <Link to="/profile" style={styles.backLink}>
              <ArrowLeft size={16} /> Back to Profile
            </Link>
          ) : (
            <Link to="/admin/orders" style={styles.backLink}>
              <ArrowLeft size={16} /> Back to Orders
            </Link>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            {user.role === 'admin' ? (
              <button onClick={handleDelete} style={styles.deleteBtn}>
                <Trash2 size={16} /> Delete
              </button>
            ) : (
              order.status === 'Pending' && (
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  style={{ ...styles.deleteBtn, opacity: cancelling ? 0.6 : 1, cursor: cancelling ? 'not-allowed' : 'pointer' }}
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              )
            )}
            <button onClick={handleDownloadPDF} style={styles.downloadBtn}>
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>

        {/* Hero header */}
        <div style={styles.hero}>
          <div>
            <p style={styles.heroLabel}>Order</p>
            <h2 style={styles.heroId}>#{order._id.slice(-8).toUpperCase()}</h2>
            <p style={styles.heroDate}>
              <Calendar size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              {new Date(order.createdAt).toLocaleString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
          {user.role === 'admin' ? (
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <select
                value={order.status}
                disabled={statusUpdating}
                onChange={(e) => handleStatusChange(e.target.value)}
                style={{
                  ...styles.statusPill,
                  background: sc.bg,
                  color: sc.color,
                  border: `1px solid ${sc.color}`,
                  cursor: statusUpdating ? 'not-allowed' : 'pointer',
                  appearance: 'none',
                  opacity: statusUpdating ? 0.6 : 1,
                  paddingRight: statusUpdating ? '40px' : '18px',
                  transition: 'opacity 0.15s, padding 0.15s',
                }}
              >
                <option value="Pending">Pending</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              {statusUpdating && (
                <Loader2
                  size={16}
                  color={sc.color}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    pointerEvents: 'none',
                    animation: 'order-status-spin 0.8s linear infinite',
                  }}
                />
              )}
              <style>{`
                @keyframes order-status-spin {
                  from { transform: rotate(0deg); }
                  to   { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : (
            <div style={{ ...styles.statusPill, background: sc.bg, color: sc.color }}>
              <StatusIcon size={18} />
              {order.status}
            </div>
          )}
        </div>

        {/* Info grid */}
        <div style={styles.infoGrid}>
          <div style={styles.infoCard}>
            <div>
              <p style={styles.infoLabel}>Payment Method</p>
              <p style={styles.infoValue}>
                {isCOD ? ' COD' : 'Online Payment'}
              </p>
            </div>
          </div>

          <div style={styles.infoCard}>
            <div>
              <p style={styles.infoLabel}>Payment ID</p>
              <p style={{ ...styles.infoValue, fontSize: '0.8rem' }}>
                {isCOD ? '—' : (order.paymentId || '—')}
              </p>
            </div>
          </div>

          <div style={styles.infoCard}>
            <div>
              <p style={styles.infoLabel}>Total Items</p>
              <p style={styles.infoValue}>
                {(order.items || []).reduce((s, i) => s + (i.qty || i.quantity || 1), 0)}
              </p>
            </div>
          </div>

          <div style={styles.infoCard}>
            <div>
              <p style={styles.infoLabel}>Total Amount</p>
              <p style={{ ...styles.infoValue, color: '#10b981' }}>
                Rs {Number(order.totalAmount).toFixed(2)}
              </p>
            </div>
          </div>

          {savedAmount > 0 && (
            <div style={{ ...styles.infoCard, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
              <div>
                <p style={{ ...styles.infoLabel, color: '#10b981' }}>You Saved </p>
                <p style={{ ...styles.infoValue, color: '#10b981' }}>
                  Rs {savedAmount.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Address */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <MapPin size={18} color="#f97316" /> Shipping Address
          </h3>
          <div style={styles.addressBox}>
            <p style={styles.addressName}>FullName: {order.address?.fullName}</p>
            <p style={styles.addressLine}>Street: {order.address?.street}</p>
            <p style={styles.addressLine}>City: {order.address?.city}, {order.address?.postalCode}</p>
            <p style={styles.addressLine}>Contact: {order.address?.phone}</p>
          </div>
        </div>

        {/* Items */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <Package size={18} color="#f97316" /> Items ({(order.items || []).length})
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {(order.items || []).map((item, idx) => {
              const product       = item.productId || {};
              const name          = product.name || item.name || 'Item';
              const image         = product.imageUrl;
              const qty           = item.qty || item.quantity || 1;
              const price         = item.price || product.price || 0;
              const originalPrice = item.originalPrice || product.price || price;
              const hasDiscount   = originalPrice > price;
              return (
                <div key={idx} style={styles.itemRow}>
                  {image ? (
                    <img src={image} alt={name} style={styles.itemImg} />
                  ) : (
                    <div style={styles.itemThumb}>
                      {String(name).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={styles.itemName}>{name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <p style={styles.itemMeta}>Qty: {qty} × Rs {Number(price).toFixed(2)}</p>
                      {hasDiscount && (
                        <span style={{ fontSize: 11, color: '#71717a', textDecoration: 'line-through' }}>
                          Rs {Number(originalPrice).toFixed(2)}
                        </span>
                      )}
                      {hasDiscount && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          background: '#ef4444', color: '#fff',
                          padding: '1px 6px', borderRadius: 4,
                        }}>
                          {Math.round((1 - price / originalPrice) * 100)}% OFF
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={styles.itemSubtotal}>Rs {(price * qty).toFixed(2)}</span>
                </div>
              );
            })}
          </div>

          <div style={styles.totalRow}>
            <span style={styles.totalLabel}>Order Total</span>
            <span style={styles.totalValue}>Rs {Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>

        {/* Related products */}
        {user.role === 'user' && order.items?.[0]?.productId?._id && (
          <RelatedProducts productId={order.items[0].productId._id} />
        )}

      </div>
    </div>
  );
};

const styles = {
  page:        { minHeight: '100vh', background: 'linear-gradient(180deg, #0b0b0e 0%, #18181b 100%)', padding: '40px 16px' },
  container:   { maxWidth: '780px', margin: '0 auto', color: '#fafafa' },
  topBar:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  backLink:    { display: 'flex', alignItems: 'center', gap: '6px', color: '#a1a1aa', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500 },
  deleteBtn:   { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid #ef4444', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' },
  downloadBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(249,115,22,0.3)' },
  primaryBtn:  { display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f97316', color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold' },
  hero:        { background: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' },
  heroLabel:   { color: '#71717a', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' },
  heroId:      { fontSize: '1.9rem', fontWeight: 800, color: '#fff', marginBottom: '8px', letterSpacing: '0.5px' },
  heroDate:    { color: '#a1a1aa', fontSize: '0.9rem', display: 'flex', alignItems: 'center' },
  statusPill:  { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '30px', fontWeight: 'bold', fontSize: '0.95rem' },
  infoGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '20px' },
  infoCard:    { background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' },
  infoLabel:   { color: '#71717a', fontSize: '0.8rem', marginBottom: '2px' },
  infoValue:   { color: '#fff', fontWeight: 'bold', fontSize: '0.95rem', wordBreak: 'break-word' },
  section:     { background: '#18181b', border: '1px solid #27272a', borderRadius: '14px', padding: '22px', marginBottom: '20px' },
  sectionTitle:{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '16px' },
  addressBox:  { background: '#09090b', border: '1px solid #27272a', borderRadius: '10px', padding: '16px' },
  addressName: { color: '#fff', fontWeight: 'bold', marginBottom: '6px' },
  addressLine: { color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '4px', lineHeight: 1.5 },
  itemRow:     { display: 'flex', alignItems: 'center', gap: '14px', background: '#09090b', border: '1px solid #27272a', borderRadius: '10px', padding: '14px' },
  itemImg:     { width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 },
  itemThumb:   { width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', flexShrink: 0 },
  itemName:    { color: '#fff', fontWeight: 600, marginBottom: '2px' },
  itemMeta:    { color: '#71717a', fontSize: '0.85rem' },
  itemSubtotal:{ color: '#10b981', fontWeight: 'bold', fontSize: '1rem', whiteSpace: 'nowrap' },
  totalRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '18px', borderTop: '1px solid #27272a' },
  totalLabel:  { color: '#a1a1aa', fontSize: '1.05rem', fontWeight: 600 },
  totalValue:  { color: '#10b981', fontSize: '1.4rem', fontWeight: 800 },
  skeletonBlock: { background: '#18181b', border: '1px solid #27272a', borderRadius: '14px', height: '80px', marginBottom: '16px' },
};

export default OrderDetails;