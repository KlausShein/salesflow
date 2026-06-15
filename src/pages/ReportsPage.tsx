import React from 'react';
import { SalesRecord, ExpenseRecord, DistributionCategory } from '../types';
import { formatPeso, computeDistribution } from '../utils/helpers';

interface ReportsPageProps {
  sales: SalesRecord[];
  expenses: ExpenseRecord[];
  categories: DistributionCategory[];
}

const ReportsPage: React.FC<ReportsPageProps> = ({ sales, expenses, categories }) => {
  const totalSales    = sales.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);
  const netIncome     = totalSales - totalExpenses;
  const distResults   = computeDistribution(totalSales, categories);

  const W = 480, H = 160, pad = { t: 16, r: 16, b: 28, l: 44 };
  const gW = W - pad.l - pad.r, gH = H - pad.t - pad.b;
  const data = sales.slice(0, 7).reverse();
  const maxV = Math.max(...data.map((d) => d.amount)) * 1.15 || 1;
  const px   = (i: number) => pad.l + i * gW / Math.max(data.length - 1, 1);
  const py   = (v: number) => pad.t + gH - (v / maxV) * gH;
  const pts  = data.map((d, i) => ({ x: px(i), y: py(d.amount) }));
  let line   = pts.length > 0 ? `M${pts[0].x},${pts[0].y}` : '';
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    line += ` C${cx},${pts[i - 1].y} ${cx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  const area = pts.length > 0
    ? `${line} L${pts[pts.length - 1].x},${H - pad.b} L${pts[0].x},${H - pad.b} Z`
    : '';

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-sub">View and analyze your business performance</p>
        </div>
        <button className="btn-primary">
          <i className="ti ti-download" aria-hidden="true" /> Export
        </button>
      </div>

      <div className="stats-row">
        {[
          { label: 'Total Sales',    value: formatPeso(totalSales),    accent: '#4f46e5' },
          { label: 'Total Expenses', value: formatPeso(totalExpenses), accent: '#ef4444' },
          { label: 'Net Income',     value: formatPeso(netIncome),     accent: '#10b981' },
          { label: 'Sales Records',  value: String(sales.length),      accent: '#f59e0b', mono: false },
        ].map((c) => (
          <div key={c.label} className="stat-card" style={{ paddingTop: 16 }}>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value" style={{ fontFamily: c.mono === false ? 'inherit' : 'var(--mono)' }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 20 }}>
        <div className="page-card">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Sales Trend</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Daily sales over last 7 entries</div>
          <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow: 'visible' }} aria-label="Sales trend chart">
            <defs>
              <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
              </linearGradient>
            </defs>
            {Array.from({ length: 4 }, (_, i) => (
              <line key={i} x1={pad.l} y1={pad.t + i * gH / 3} x2={W - pad.r} y2={pad.t + i * gH / 3} stroke="#e5e7eb" strokeWidth="1" />
            ))}
            {area && <path d={area} fill="url(#rg)" />}
            {line && <path d={line} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />}
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#4f46e5" stroke="#fff" strokeWidth="2" />
            ))}
            {data.map((d, i) => (
              <text key={i} x={px(i)} y={H - pad.b + 14} textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="Plus Jakarta Sans">
                {d.displayDate.split(', ')[0].split(' ').slice(0, 2).join(' ')}
              </text>
            ))}
          </svg>
        </div>

        <div className="page-card">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Total Distribution</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Breakdown from total sales</div>
          {distResults.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: r.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{r.name} ({r.percentage}%)</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: r.color }}>
                {formatPeso(r.amount || 0)}
              </span>
            </div>
          ))}
          <div style={{ borderTop: '1.5px solid var(--border)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Total</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>{formatPeso(totalSales)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;