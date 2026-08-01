import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement, Tooltip
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement, Tooltip
);

const token = {
  bg:      '#0f0f0f',
  surface: '#1a1a1a',
  border:  '#2a2a2a',
  orange:  '#f97316',
  text:    '#f1f1f1',
  muted:   '#6b6b6b',
  sub:     '#c4c4c4',
};

const panel = {
  background: token.surface,
  border: `0.5px solid ${token.border}`,
  borderRadius: 10,
  padding: '18px',
};

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1f1f1f',
      borderColor: '#333',
      borderWidth: 0.5,
      titleColor: '#e0e0e0',
      bodyColor: '#888',
      padding: 10,
    },
  },
};

const scaleStyle = {
  grid:   { color: 'rgba(255,255,255,0.05)' },
  ticks:  { color: '#555', font: { size: 12 } },
  border: { color: '#222' },
};

const STATUS_CONFIG = [
  { key: 'delivered',  label: 'Delivered',  color: '#4ade80' },
  { key: 'pending',    label: 'Pending',    color: '#f97316' },
  { key: 'shipped',    label: 'Shipped',    color: '#60a5fa' },
  { key: 'cancelled',  label: 'Cancelled',  color: '#f87171' },
];

// ── Range options for the revenue chart ─────────────────────
const RANGE_OPTIONS = [
  { key: '1d',  label: '1 Day' },
  { key: '1m',  label: '1 Month' },
  { key: '6m',  label: '6 Months' },
  { key: '1y',  label: '1 Year' },
  { key: 'all', label: 'All time' },
];

const MetricCard = ({ label, value, delta, deltaType }) => (
  <div style={panel}>
    <div style={{ fontSize: 17, color: token.muted, marginBottom: 10 }}>{label}</div>
    <div style={{ fontSize: 17, fontWeight: 500, color: token.text,
      letterSpacing: '-0.5px', marginBottom: 4 }}>{value}</div>
    <div style={{ fontSize: 17,
      color: deltaType === 'up' ? '#4ade80' : deltaType === 'warn' ? '#f87171' : token.muted
    }}>{delta}</div>
  </div>
);

const AdminDashboard = () => {
  const { user }   = useContext(AuthContext);
  const navigate   = useNavigate();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [range, setRange]     = useState('1d');
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }

    const isFirstLoad = stats === null;
    if (isFirstLoad) setLoading(true); else setChartLoading(true);

    fetch(`/api/analytics/getAnalytics?range=${range}`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(r => {
        if (r.status === 401) { navigate('/login'); return null; }
        if (!r.ok) throw new Error('Failed to load analytics');
        return r.json();
      })
      .then(data => { if (data) setStats(data); })
      .catch(err => setError(err.message))
      .finally(() => { setLoading(false); setChartLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, range]);

  const months  = stats?.monthlyRevenue?.map(m => m.month)   ?? [];
  const revData = stats?.monthlyRevenue?.map(m => m.revenue) ?? [];
  const ordData = stats?.monthlyRevenue?.map(m => m.orders)  ?? [];

  const statusData   = STATUS_CONFIG.map(s => stats?.ordersByStatus?.[s.key] ?? 0);
  const statusColors = STATUS_CONFIG.map(s => s.color);

  const catLabels = stats?.topCategories?.map(c => c.name)  ?? [];
  const catCounts = stats?.topCategories?.map(c => c.count) ?? [];
  const catColors = catCounts.map((_, i) => `rgba(249,115,22,${1 - i * 0.13})`);

  const rangeLabel = RANGE_OPTIONS.find(r => r.key === range)?.label ?? '6 Months';

const controls = [
  { label: 'Add categories', path: '/admin/categories', isNew: true , primary: true },
  { label: 'Add product',       path: '/admin/add-product'},
  { label: 'Manage products',   path: '/admin/products' },
  { label: 'Manage orders',     path: '/admin/orders' },
  { label: 'Users directory',   path: '/admin/users' },
];

  return (
    <div style={{ background: token.bg, borderRadius: 16, padding: 28,
      maxWidth: 1100, margin: '0 auto' }}>

      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 6 }}>
        {/* <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8,
            background: token.orange, display: 'flex',
            alignItems: 'center', justifyContent: 'center' }}>
            <img src="/ShopNestLogo.png" alt=""
              style={{ width: 22, height: 22, objectFit: 'cover', borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 500,
            color: token.text, letterSpacing: '-0.2px' }}>ShopNest</span>
        </div> */}
        {/* <span style={{ fontSize: 17, padding: '3px 10px', borderRadius: 20,
          background: 'rgba(249,115,22,0.12)', color: token.orange,
          border: '0.5px solid rgba(249,115,22,0.3)', fontWeight: 500 }}>
          Admin panel
        </span> */}
      </div>
      <p style={{ fontSize: 17, color: token.muted, marginBottom: 24 }}>
        Welcome back,{' '}
        <span style={{ color: token.sub, fontWeight: 500 }}>{user?.name}</span>
        {' '}— here is your store overview
      </p>

      {/* ── states ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0',
          color: token.orange, fontSize: 17 }}>Loading metrics...</div>
      )}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 16,
          background: 'rgba(248,113,113,0.08)',
          border: '0.5px solid rgba(248,113,113,0.2)',
          color: '#f87171', fontSize: 17 }}>{error}</div>
      )}

      {!loading && stats && (
        <>
          {/* ── metric cards ── */}
          <div style={{ display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
            gap: 10, marginBottom: 16 }}>
            <MetricCard
              label="Total orders"
              value={stats.totalOrders}
              delta={`${stats.totalOrders} orders placed`}
              deltaType="up" />
            <MetricCard
              label="Total products"
              value={stats.totalProducts}
              delta="Active in catalogue"
              deltaType="neu" />
            <MetricCard
              label="Total users"
              value={stats.totalUsers}
              delta="Registered accounts"
              deltaType="up" />
            <MetricCard
              label="Total revenue"
              value={`₹${Number(stats.totalRevenue).toLocaleString('en-IN')}`}
              delta="Across all orders"
              deltaType="up" />
          </div>

          {/* ── administrative controls ── */}
          <div style={{ ...panel, marginBottom: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 500,
              color: '#e0e0e0', marginBottom: 14 }}>Administrative controls</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
           {controls.map(b => (
  <button
    key={b.path}
    onClick={() => navigate(b.path)}
    style={{
      position: 'relative',
      display: 'inline-flex', alignItems: 'center',
      padding: '8px 16px', borderRadius: 8,
      fontSize: 17, fontWeight: 400, cursor: 'pointer',
      border: b.primary
        ? `0.5px solid ${token.orange}`
        : `0.5px solid ${token.border}`,
      background: b.primary ? token.orange : '#242424',
      color: b.primary ? '#fff' : token.sub,
      transition: 'border-color 0.15s, color 0.15s',
    }}
  >
    {b.label}
    {b.isNew && (
      <span style={{
        position: 'absolute',
        top: -8, right: -8,
        background: token.orange,
        color: '#fff',
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 6px',
        borderRadius: 20,
        border: `1px solid ${token.bg}`,
        lineHeight: 1,
      }}>
        New
      </span>
    )}
  </button>
))}
            </div>
          </div>

          {/* ── revenue chart ── */}
          <div style={{ ...panel, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 2 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 500,
                  color: '#e0e0e0', marginBottom: 2 }}>Revenue over time</div>
                <div style={{ fontSize: 17, color: '#555' }}>
                  {rangeLabel} — bars = revenue (INR), line = order count
                </div>
              </div>

              {/* range selector */}
              <div style={{ display: 'flex', gap: 4, background: '#141414',
                border: `0.5px solid ${token.border}`, borderRadius: 8, padding: 3 }}>
                {RANGE_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setRange(opt.key)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      background: range === opt.key ? token.orange : 'transparent',
                      color: range === opt.key ? '#fff' : token.muted,
                      transition: 'background 0.15s, color 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14, margin: '14px 0 12px' }}>
              {[['#f97316','Revenue'],['#555','Orders']].map(([c, l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center',
                  gap: 5, fontSize: 17, color: '#777' }}>
                  <span style={{ width: 9, height: 9,
                    borderRadius: 2, background: c }} />
                  {l}
                </span>
              ))}
            </div>

            <div style={{ height: 220, position: 'relative' }}>
              {chartLoading && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(26,26,26,0.6)', borderRadius: 8, zIndex: 1,
                  fontSize: 13, color: token.orange,
                }}>
                  Updating chart...
                </div>
              )}
              {months.length > 0 ? (
                <Bar
                  data={{
                    labels: months,
                    datasets: [
                      {
                        type: 'bar',
                        label: 'Revenue',
                        data: revData,
                        backgroundColor: '#f97316',
                        borderRadius: 3,
                        yAxisID: 'y',
                        order: 2,
                      },
                      {
                        type: 'line',
                        label: 'Orders',
                        data: ordData,
                        borderColor: '#555',
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        borderDash: [4, 3],
                        pointRadius: 3,
                        pointBackgroundColor: '#888',
                        tension: 0.4,
                        yAxisID: 'y2',
                        order: 1,
                      },
                    ],
                  }}
                  options={{
                    ...chartDefaults,
                    scales: {
                      x: scaleStyle,
                      y: {
                        ...scaleStyle,
                        position: 'left',
                        ticks: {
                          ...scaleStyle.ticks,
                          callback: v => '₹' + (v / 1000).toFixed(0) + 'k',
                        },
                      },
                      y2: {
                        ...scaleStyle,
                        position: 'right',
                        grid: { display: false },
                      },
                    },
                  }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center',
                  justifyContent: 'center', height: '100%', color: token.muted, fontSize: 13 }}>
                  No revenue data for this period.
                </div>
              )}
            </div>
          </div>

          {/* ── doughnut + horizontal bar ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 10, marginBottom: 10 }}>

            {/* orders by status */}
            <div style={panel}>
              <div style={{ fontSize: 17, fontWeight: 500,
                color: '#e0e0e0', marginBottom: 2 }}>Orders by status</div>
              <div style={{ fontSize: 17, color: '#555', marginBottom: 10 }}>
                {rangeLabel}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap',
                gap: 10, marginBottom: 12 }}>
                {STATUS_CONFIG.map((s, i) => (
                  <span key={s.key} style={{ display: 'flex',
                    alignItems: 'center', gap: 5,
                    fontSize: 17, color: '#777' }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2,
                      background: s.color }} />
                    {s.label} {statusData[i]}
                  </span>
                ))}
              </div>
              <div style={{ height: 190 }}>
                <Doughnut
                  data={{
                    labels: STATUS_CONFIG.map(s => s.label),
                    datasets: [{
                      data: statusData,
                      backgroundColor: statusColors,
                      borderWidth: 0,
                      hoverOffset: 4,
                    }],
                  }}
                  options={{ ...chartDefaults, cutout: '68%' }}
                />
              </div>
            </div>

            {/* products by category */}
            <div style={panel}>
              <div style={{ fontSize: 17, fontWeight: 500,
                color: '#e0e0e0', marginBottom: 2 }}>Products by category</div>
              <div style={{ fontSize: 17, color: '#555', marginBottom: 14 }}>
                Units sold — {rangeLabel}
              </div>
              <div style={{ height: 230 }}>
                <Bar
                  data={{
                    labels: catLabels,
                    datasets: [{
                      data: catCounts,
                      backgroundColor: catColors,
                      borderRadius: 3,
                    }],
                  }}
                  options={{
                    ...chartDefaults,
                    indexAxis: 'y',
                    scales: {
                      x: scaleStyle,
                      y: {
                        ...scaleStyle,
                        grid: { display: false },
                        ticks: { color: '#aaa', font: { size: 12 } },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;