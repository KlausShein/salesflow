import React, { useState, useMemo, useRef } from 'react';
import { SalesRecord, ExpenseRecord, DistributionCategory } from '../types';
import { formatPeso, computeDistribution } from '../utils/helpers';

interface ReportsPageProps {
  sales:      SalesRecord[];
  expenses:   ExpenseRecord[];
  categories: DistributionCategory[];
}

// ─── Date Range Types ─────────────────────────────────────────
type RangeKey = 'this_week' | 'this_month' | 'last_30' | 'last_month' | 'all';
type TabKey   = 'overview' | 'pnl' | 'forecast' | 'trends';

interface RangeOption { key: RangeKey; label: string }
const RANGES: RangeOption[] = [
  { key: 'this_week',  label: 'This Week'   },
  { key: 'this_month', label: 'This Month'  },
  { key: 'last_30',    label: 'Last 30 Days'},
  { key: 'last_month', label: 'Last Month'  },
  { key: 'all',        label: 'All Time'    },
];

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview',    icon: 'ti-layout-dashboard' },
  { key: 'pnl',      label: 'P&L Summary', icon: 'ti-table'            },
  { key: 'forecast', label: 'Forecast',    icon: 'ti-chart-arrows-vertical' },
  { key: 'trends',   label: 'Trends',      icon: 'ti-trending-up'      },
];

const getDateBounds = (key: RangeKey): { from: Date | null; to: Date | null } => {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (key === 'all') return { from: null, to: null };
  if (key === 'this_week') {
    const day = today.getDay();
    const from = new Date(today); from.setDate(today.getDate() - day);
    return { from, to: today };
  }
  if (key === 'this_month') return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today };
  if (key === 'last_30') {
    const from = new Date(today); from.setDate(today.getDate() - 29);
    return { from, to: today };
  }
  if (key === 'last_month') {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to   = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from, to };
  }
  return { from: null, to: null };
};

const inRange = (dateStr: string, from: Date | null, to: Date | null): boolean => {
  if (!from && !to) return true;
  const d = new Date(dateStr + 'T00:00:00');
  if (from && d < from) return false;
  if (to   && d > to  ) return false;
  return true;
};

// ─── Donut Chart ──────────────────────────────────────────────
const DonutChart: React.FC<{ slices: { label: string; value: number; color: string }[] }> = ({ slices }) => {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140, color: 'var(--muted)', fontSize: 13 }}>
      No expense data
    </div>
  );
  const cx = 70, cy = 70, r = 54, inner = 34;
  let angle = -Math.PI / 2;
  const paths: { d: string; color: string; label: string; pct: number }[] = [];
  slices.forEach(slice => {
    const pct   = slice.value / total;
    const sweep = pct * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + sweep), y2 = cy + r * Math.sin(angle + sweep);
    const xi1 = cx + inner * Math.cos(angle), yi1 = cy + inner * Math.sin(angle);
    const xi2 = cx + inner * Math.cos(angle + sweep), yi2 = cy + inner * Math.sin(angle + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    paths.push({
      d: `M${xi1},${yi1} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${xi2},${yi2} A${inner},${inner} 0 ${large} 0 ${xi1},${yi1} Z`,
      color: slice.color, label: slice.label, pct: Math.round(pct * 100),
    });
    angle += sweep;
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={140} height={140} viewBox="0 0 140 140" style={{ flexShrink: 0 }}>
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} stroke="#fff" strokeWidth="1.5">
            <title>{p.label}: {p.pct}%</title>
          </path>
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fill="var(--muted)" fontFamily="Plus Jakarta Sans">Total</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)" fontFamily="Plus Jakarta Sans">
          {formatPeso(total)}
        </text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {paths.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 11, color: 'var(--sub)', fontWeight: 500 }}>{p.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: p.color }}>{p.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DONUT_COLORS = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];

// ─── Linear Regression ────────────────────────────────────────
const linearRegression = (points: { x: number; y: number }[]) => {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0 };
  const sumX  = points.reduce((s, p) => s + p.x, 0);
  const sumY  = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
};

// ─── Dual Line Chart (Sales + Expenses) ───────────────────────
const DualTrendChart: React.FC<{
  salesData:    { date: string; amount: number }[];
  expenseData:  { date: string; amount: number }[];
}> = ({ salesData, expenseData }) => {
  const W = 560, H = 180, pad = { t: 20, r: 20, b: 36, l: 52 };
  const gW = W - pad.l - pad.r, gH = H - pad.t - pad.b;

  const allDates = Array.from(new Set([...salesData.map(d => d.date), ...expenseData.map(d => d.date)])).sort();
  if (allDates.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: H, color: 'var(--muted)', fontSize: 13 }}>
      No data available
    </div>
  );

  const salesMap:   Record<string, number> = {};
  const expenseMap: Record<string, number> = {};
  salesData.forEach(d   => { salesMap[d.date]   = (salesMap[d.date]   ?? 0) + d.amount; });
  expenseData.forEach(d => { expenseMap[d.date] = (expenseMap[d.date] ?? 0) + d.amount; });

  const maxV = Math.max(...allDates.map(d => Math.max(salesMap[d] ?? 0, expenseMap[d] ?? 0))) * 1.15 || 1;

  const px = (i: number) => pad.l + (i / Math.max(allDates.length - 1, 1)) * gW;
  const py = (v: number) => pad.t + gH - (v / maxV) * gH;

  const makePath = (map: Record<string, number>) => {
    const pts = allDates.map((d, i) => ({ x: px(i), y: py(map[d] ?? 0) }));
    if (pts.length === 0) return '';
    let path = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cx2 = (pts[i - 1].x + pts[i].x) / 2;
      path += ` C${cx2},${pts[i - 1].y} ${cx2},${pts[i].y} ${pts[i].x},${pts[i].y}`;
    }
    return path;
  };

  const salesPath   = makePath(salesMap);
  const expensePath = makePath(expenseMap);

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (maxV / tickCount) * i);
  const labelStep = Math.max(1, Math.floor(allDates.length / 6));

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="eg2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} y1={py(t)} x2={W - pad.r} y2={py(t)} stroke="var(--border, #e5e7eb)" strokeWidth="1" />
          <text x={pad.l - 6} y={py(t) + 4} textAnchor="end" fontSize="9" fill="#9ca3af" fontFamily="Plus Jakarta Sans">
            {t >= 1000 ? `₱${(t / 1000).toFixed(0)}k` : `₱${t.toFixed(0)}`}
          </text>
        </g>
      ))}
      {salesPath && (
        <path
          d={`${salesPath} L${px(allDates.length - 1)},${H - pad.b} L${px(0)},${H - pad.b} Z`}
          fill="url(#sg2)"
        />
      )}
      {expensePath && (
        <path
          d={`${expensePath} L${px(allDates.length - 1)},${H - pad.b} L${px(0)},${H - pad.b} Z`}
          fill="url(#eg2)"
        />
      )}
      {salesPath   && <path d={salesPath}   fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />}
      {expensePath && <path d={expensePath} fill="none" stroke="#ef4444" strokeWidth="2"   strokeLinecap="round" strokeDasharray="5,3" />}
      {allDates.map((d, i) => i % labelStep === 0 && (
        <text key={d} x={px(i)} y={H - pad.b + 14} textAnchor="middle" fontSize="8.5" fill="#9ca3af" fontFamily="Plus Jakarta Sans">
          {d.slice(5)}
        </text>
      ))}
    </svg>
  );
};

// ─── Forecast Chart ───────────────────────────────────────────
const ForecastChart: React.FC<{
  salesData: { date: string; amount: number }[];
  forecastDays?: number;
}> = ({ salesData, forecastDays = 30 }) => {
  const W = 560, H = 200, pad = { t: 20, r: 20, b: 36, l: 52 };
  const gW = W - pad.l - pad.r, gH = H - pad.t - pad.b;

  const dateMap: Record<string, number> = {};
  salesData.forEach(d => { dateMap[d.date] = (dateMap[d.date] ?? 0) + d.amount; });
  const sorted = Object.entries(dateMap).sort(([a], [b]) => a.localeCompare(b));

  if (sorted.length < 2) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: H, color: 'var(--muted)', fontSize: 13 }}>
      Need at least 2 data points to forecast
    </div>
  );

  const histPoints = sorted.map(([, v], i) => ({ x: i, y: v }));
  const { slope, intercept } = linearRegression(histPoints);

  const lastDate = new Date(sorted[sorted.length - 1][0] + 'T00:00:00');
  const forecastPoints: { date: string; y: number }[] = [];
  for (let i = 1; i <= forecastDays; i++) {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const y = Math.max(0, slope * (sorted.length - 1 + i) + intercept);
    forecastPoints.push({ date: dateStr, y });
  }

  const allPoints = [
    ...sorted.map(([date, y]) => ({ date, y, forecast: false })),
    ...forecastPoints.map(p => ({ ...p, forecast: true })),
  ];

  const maxV = Math.max(...allPoints.map(p => p.y)) * 1.2 || 1;
  const total = allPoints.length;
  const px = (i: number) => pad.l + (i / Math.max(total - 1, 1)) * gW;
  const py = (v: number) => pad.t + gH - (v / maxV) * gH;

  const histPts  = allPoints.filter(p => !p.forecast);
  const fcstPts  = allPoints.filter(p => p.forecast);
  const joinPt   = allPoints[sorted.length - 1];
  const joinIdx  = sorted.length - 1;

  const makeLinePath = (pts: typeof allPoints, offset: number) => {
    if (pts.length === 0) return '';
    let path = `M${px(offset)},${py(pts[0].y)}`;
    for (let i = 1; i < pts.length; i++) {
      const cx2 = (px(offset + i - 1) + px(offset + i)) / 2;
      path += ` C${cx2},${py(pts[i - 1].y)} ${cx2},${py(pts[i].y)} ${px(offset + i)},${py(pts[i].y)}`;
    }
    return path;
  };

  const histPath = makeLinePath(histPts, 0);
  const fcstPath = `M${px(joinIdx)},${py(joinPt.y)} ` + makeLinePath(fcstPts, joinIdx + 1).replace(/^M[^C]+/, '');

  const ticks = Array.from({ length: 4 }, (_, i) => (maxV / 4) * (i + 1));
  const labelStep = Math.max(1, Math.floor(total / 7));

  const projectedTotal = forecastPoints.reduce((s, p) => s + p.y, 0);
  const avgForecast    = projectedTotal / forecastDays;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Avg Forecast/Day', value: formatPeso(avgForecast),    color: '#4f46e5' },
          { label: '30-Day Projection', value: formatPeso(projectedTotal), color: '#10b981' },
          { label: 'Trend',            value: slope >= 0 ? '↑ Growing' : '↓ Declining', color: slope >= 0 ? '#10b981' : '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, padding: '12px 14px', background: 'rgba(255,255,255,0.3)', borderRadius: 10, border: '1px solid var(--glass-border, rgba(255,255,255,0.2))' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: 'var(--mono)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} y1={py(t)} x2={W - pad.r} y2={py(t)} stroke="var(--border, #e5e7eb)" strokeWidth="1" />
            <text x={pad.l - 6} y={py(t) + 4} textAnchor="end" fontSize="9" fill="#9ca3af" fontFamily="Plus Jakarta Sans">
              {t >= 1000 ? `₱${(t / 1000).toFixed(0)}k` : `₱${t.toFixed(0)}`}
            </text>
          </g>
        ))}
        <rect
          x={px(joinIdx)} y={pad.t}
          width={px(total - 1) - px(joinIdx)} height={gH}
          fill="rgba(16,185,129,0.04)"
        />
        <line x1={px(joinIdx)} y1={pad.t} x2={px(joinIdx)} y2={pad.t + gH} stroke="#10b981" strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
        <text x={px(joinIdx) + 5} y={pad.t + 11} fontSize="9" fill="#10b981" fontFamily="Plus Jakarta Sans" fontWeight="600">Forecast →</text>
        {histPath && (
          <path d={`${histPath} L${px(joinIdx)},${H - pad.b} L${px(0)},${H - pad.b} Z`} fill="url(#hg)" />
        )}
        {fcstPath && (
          <path d={`${fcstPath} L${px(total - 1)},${H - pad.b} L${px(joinIdx)},${H - pad.b} Z`} fill="url(#fg)" />
        )}
        {histPath && <path d={histPath} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />}
        {fcstPath && <path d={fcstPath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeDasharray="6,3" />}
        {histPts.map((p, i) => (
          <circle key={i} cx={px(i)} cy={py(p.y)} r="3" fill="#4f46e5" stroke="#fff" strokeWidth="1.5" />
        ))}
        {allPoints.map((p, i) => i % labelStep === 0 && (
          <text key={p.date} x={px(i)} y={H - pad.b + 14} textAnchor="middle" fontSize="8.5" fill={p.forecast ? '#10b981' : '#9ca3af'} fontFamily="Plus Jakarta Sans">
            {p.date.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  );
};

// ─── P&L Table ────────────────────────────────────────────────
const PnLTable: React.FC<{
  totalSales:    number;
  totalExpenses: number;
  expenseCatMap: Record<string, number>;
  distResults:   { id: string; name: string; percentage: number; amount: number; color: string }[];
  rangeLabel:    string;
  onExportPDF:   () => void;
}> = ({ totalSales, totalExpenses, expenseCatMap, distResults, rangeLabel, onExportPDF }) => {
  const grossProfit      = totalSales - totalExpenses;
  const totalDistributed = distResults.reduce((s, r) => s + r.amount, 0);
  // FIX: Net Remaining = Gross Profit - Distribution (both already exclude expenses)
  const netRemaining     = grossProfit - totalDistributed;

  const row = (
    label: string,
    value: number,
    opts: { indent?: boolean; bold?: boolean; color?: string; borderTop?: boolean; bg?: string } = {}
  ) => (
    <tr
      style={{
        background: opts.bg ?? 'transparent',
        borderTop: opts.borderTop ? '2px solid var(--border, #e5e7eb)' : undefined,
      }}
    >
      <td style={{
        padding: opts.indent ? '8px 16px 8px 36px' : '10px 16px',
        fontSize: opts.bold ? 13 : 12,
        fontWeight: opts.bold ? 700 : 500,
        color: opts.color ?? 'var(--text)',
      }}>
        {label}
      </td>
      <td style={{
        padding: '8px 16px',
        textAlign: 'right',
        fontFamily: 'var(--mono)',
        fontSize: opts.bold ? 14 : 12,
        fontWeight: opts.bold ? 800 : 600,
        color: opts.color ?? 'var(--text)',
      }}>
        {formatPeso(value)}
      </td>
      <td style={{
        padding: '8px 16px',
        textAlign: 'right',
        fontSize: 11,
        color: 'var(--muted)',
        fontWeight: 500,
      }}>
        {totalSales > 0 ? `${((value / totalSales) * 100).toFixed(1)}%` : '—'}
      </td>
    </tr>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Profit & Loss Summary</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{rangeLabel} — Full breakdown</div>
        </div>
        <button
          onClick={onExportPDF}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: 'var(--accent, #4f46e5)', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
            fontFamily: 'inherit',
          }}
        >
          <i className="ti ti-download" /> Export PDF
        </button>
      </div>

      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid var(--border, rgba(0,0,0,0.08))' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(79,70,229,0.06)' }}>
              {['Line Item', 'Amount', '% of Revenue'].map(h => (
                <th key={h} style={{
                  padding: '11px 16px', textAlign: h === 'Line Item' ? 'left' : 'right',
                  fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '.6px',
                  borderBottom: '1.5px solid var(--border, rgba(0,0,0,0.08))',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {row('Total Revenue (Sales)', totalSales, { bold: true, color: '#4f46e5', bg: 'rgba(79,70,229,0.03)' })}
            {row('Total Expenses', totalExpenses, { bold: true, color: '#ef4444', borderTop: true })}
            {Object.entries(expenseCatMap).sort((a, b) => b[1] - a[1]).map(([cat, amt]) =>
                <React.Fragment key={cat}>
                  {row(cat, amt, { indent: true, color: 'var(--sub)' })}
                </React.Fragment>
              )}
            {row('Gross Profit', grossProfit, {
              bold: true, borderTop: true,
              color: grossProfit >= 0 ? '#10b981' : '#ef4444',
              bg: 'rgba(16,185,129,0.04)',
            })}
            {distResults.length > 0 && (
              <>
                {row('Distribution Allocations', totalDistributed, { bold: true, color: '#f59e0b', borderTop: true })}
                {distResults.map(r => (
                  <React.Fragment key={r.id}>
                    {row(`${r.name} (${r.percentage}%)`, r.amount, { indent: true, color: r.color })}
                  </React.Fragment>
                ))}
              </>
            )}
            {row('Net Remaining', netRemaining, {
              bold: true, borderTop: true,
              color: netRemaining >= 0 ? '#10b981' : '#ef4444',
              bg: netRemaining >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(255,255,255,0.3)', borderRadius: 10, border: '1px solid var(--glass-border, rgba(255,255,255,0.2))' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          <i className="ti ti-bulb" style={{ marginRight: 6, color: '#f59e0b' }} />
          Quick Insight
        </div>
        <div style={{ fontSize: 12, color: 'var(--sub)', lineHeight: 1.6 }}>
          {totalSales === 0
            ? 'No sales recorded for this period.'
            : netRemaining >= 0
              ? `After covering expenses and distributions, you retain ${formatPeso(netRemaining)} (${((netRemaining / totalSales) * 100).toFixed(1)}% of revenue).`
              : `You are ${formatPeso(Math.abs(netRemaining))} short after expenses and distributions. Consider reviewing your cost structure.`
          }
        </div>
      </div>
    </div>
  );
};

// ─── PDF Export ────────────────────────────────────────────────
const buildPrintHTML = (params: {
  rangeLabel:    string;
  totalSales:    number;
  totalExpenses: number;
  netIncome:     number;
  expenseCatMap: Record<string, number>;
  distResults:   { name: string; percentage: number; amount: number }[];
  avgDailySales: number;
  bestDay:       { day: number; total: number } | null;
  worstDay:      { day: number; total: number } | null;
}) => {
  const { rangeLabel, totalSales, totalExpenses, netIncome, expenseCatMap, distResults, avgDailySales, bestDay, worstDay } = params;
  const totalDist    = distResults.reduce((s, r) => s + r.amount, 0);
  // FIX: Net Remaining = Gross Profit - Distribution (distribution is based on gross profit)
  const netRemaining = netIncome - totalDist;

  const fp  = (v: number) => `₱${v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pct = (v: number) => totalSales > 0 ? `${((v / totalSales) * 100).toFixed(1)}%` : '—';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Sales Flow Report — ${rangeLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; padding-bottom: 20px; border-bottom: 3px solid #4f46e5; }
  .logo { font-size: 22px; font-weight: 800; color: #4f46e5; }
  .logo span { color: #10b981; }
  .meta { text-align: right; font-size: 12px; color: #6b7280; }
  .meta strong { display: block; font-size: 14px; color: #1a1a2e; margin-bottom: 2px; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat { padding: 16px; border-radius: 10px; border: 1.5px solid #e5e7eb; }
  .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: .6px; color: #6b7280; font-weight: 700; margin-bottom: 6px; }
  .stat-value { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; }
  h2 { font-size: 14px; font-weight: 700; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1.5px solid #e5e7eb; color: #374151; text-transform: uppercase; letter-spacing: .5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  th { padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; color: #6b7280; border-bottom: 2px solid #e5e7eb; background: #f9fafb; }
  th:not(:first-child) { text-align: right; }
  td { padding: 9px 12px; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
  td:not(:first-child) { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
  .row-bold td { font-weight: 700; font-size: 13px; background: #f9fafb; }
  .row-indent td:first-child { padding-left: 28px; color: #6b7280; font-weight: 400; }
  .row-net td { font-weight: 800; font-size: 14px; background: #f0fdf4; }
  .positive { color: #10b981; }
  .negative { color: #ef4444; }
  .accent   { color: #4f46e5; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">Sales<span>Flow</span></div>
    <div style="font-size:12px;color:#6b7280;margin-top:4px">Business Performance Report</div>
  </div>
  <div class="meta">
    <strong>${rangeLabel}</strong>
    Generated ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
  </div>
</div>

<div class="stats-grid">
  <div class="stat" style="border-color:#4f46e5;background:#f5f3ff">
    <div class="stat-label">Total Revenue</div>
    <div class="stat-value accent">${fp(totalSales)}</div>
  </div>
  <div class="stat" style="border-color:#ef4444;background:#fff5f5">
    <div class="stat-label">Total Expenses</div>
    <div class="stat-value negative">${fp(totalExpenses)}</div>
  </div>
  <div class="stat" style="border-color:#10b981;background:#f0fdf4">
    <div class="stat-label">Gross Profit</div>
    <div class="stat-value positive">${fp(netIncome)}</div>
  </div>
</div>

<h2>Profit & Loss Statement</h2>
<table>
  <thead><tr><th>Line Item</th><th>Amount</th><th>% of Revenue</th></tr></thead>
  <tbody>
    <tr class="row-bold"><td>Total Revenue (Sales)</td><td class="accent">${fp(totalSales)}</td><td>${pct(totalSales)}</td></tr>
    <tr class="row-bold"><td>Total Expenses</td><td class="negative">${fp(totalExpenses)}</td><td>${pct(totalExpenses)}</td></tr>
    ${Object.entries(expenseCatMap).sort((a, b) => b[1] - a[1]).map(([cat, amt]) =>
      `<tr class="row-indent"><td>${cat}</td><td>${fp(amt)}</td><td>${pct(amt)}</td></tr>`
    ).join('')}
    <tr class="row-bold"><td>Gross Profit</td><td class="${netIncome >= 0 ? 'positive' : 'negative'}">${fp(netIncome)}</td><td>${pct(netIncome)}</td></tr>
    ${distResults.length > 0 ? `
    <tr class="row-bold"><td>Distribution Allocations</td><td style="color:#f59e0b">${fp(totalDist)}</td><td>${pct(totalDist)}</td></tr>
    ${distResults.map(r => `<tr class="row-indent"><td>${r.name} (${r.percentage}%)</td><td>${fp(r.amount)}</td><td>${pct(r.amount)}</td></tr>`).join('')}
    ` : ''}
    <tr class="row-net"><td>Net Remaining</td><td class="${netRemaining >= 0 ? 'positive' : 'negative'}">${fp(netRemaining)}</td><td>${pct(netRemaining)}</td></tr>
  </tbody>
</table>

<h2>Performance Highlights</h2>
<table>
  <thead><tr><th>Metric</th><th>Value</th></tr></thead>
  <tbody>
    <tr><td>Avg Daily Sales</td><td class="accent">${fp(avgDailySales)}</td></tr>
    ${bestDay  ? `<tr><td>Best Day of Week</td><td class="positive">${DAY_NAMES[bestDay.day]} (${fp(bestDay.total)})</td></tr>` : ''}
    ${worstDay ? `<tr><td>Worst Day of Week</td><td class="negative">${DAY_NAMES[worstDay.day]} (${fp(worstDay.total)})</td></tr>` : ''}
  </tbody>
</table>

<div class="footer">Sales Flow · Confidential Business Report · ${new Date().getFullYear()}</div>
</body>
</html>`;
};

// ─── Main Component ───────────────────────────────────────────
const ReportsPage: React.FC<ReportsPageProps> = ({ sales, expenses, categories }) => {
  const [range, setRange] = useState<RangeKey>('this_month');
  const [tab,   setTab]   = useState<TabKey>('overview');

  const { from, to } = useMemo(() => getDateBounds(range), [range]);

  const filteredSales    = useMemo(() => sales.filter(s    => inRange(s.date, from, to)), [sales,    from, to]);
  const filteredExpenses = useMemo(() => expenses.filter(e => inRange(e.date, from, to)), [expenses, from, to]);

  const totalSales    = filteredSales.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = filteredExpenses.reduce((s, r) => s + r.amount, 0);
  const netIncome     = totalSales - totalExpenses;

  // FIX: Distribute from gross profit (netIncome), not totalSales.
  // This prevents double-counting expenses in the P&L Net Remaining calculation.
  const distResults = computeDistribution(netIncome, categories).map(r => ({
    ...r,
    amount: r.amount ?? 0,
  }));

  // Total actually distributed (for display use)
  const totalDistributed = distResults.reduce((s, r) => s + r.amount, 0);

  const uniqueSaleDays    = new Set(filteredSales.map(s => s.date)).size;
  const uniqueExpenseDays = new Set(filteredExpenses.map(e => e.date)).size;
  const avgDailySales     = uniqueSaleDays    > 0 ? totalSales    / uniqueSaleDays    : 0;
  const avgDailyExpenses  = uniqueExpenseDays > 0 ? totalExpenses / uniqueExpenseDays : 0;

  const dayTotals = useMemo(() => {
    const map: Record<number, number> = {};
    filteredSales.forEach(s => {
      const dow = new Date(s.date + 'T00:00:00').getDay();
      map[dow] = (map[dow] ?? 0) + s.amount;
    });
    return map;
  }, [filteredSales]);

  const dayEntries = Object.entries(dayTotals).map(([d, v]) => ({ day: Number(d), total: v }));
  const bestDay    = dayEntries.length > 0 ? dayEntries.reduce((a, b) => a.total > b.total ? a : b) : null;
  const worstDay   = dayEntries.length > 1 ? dayEntries.reduce((a, b) => a.total < b.total ? a : b) : null;

  const expenseCatMap = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const cat = e.category || 'Uncategorized';
      map[cat] = (map[cat] ?? 0) + e.amount;
    });
    return map;
  }, [filteredExpenses]);

  const expenseSlices = Object.entries(expenseCatMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([label, value], i) => ({ label, value, color: DONUT_COLORS[i % DONUT_COLORS.length] }));

  const W = 480, H = 160, pad = { t: 16, r: 16, b: 28, l: 44 };
  const gW = W - pad.l - pad.r, gH = H - pad.t - pad.b;

  const chartData = [...filteredSales]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  const maxV = Math.max(...chartData.map(d => d.amount)) * 1.15 || 1;
  const px   = (i: number) => pad.l + i * gW / Math.max(chartData.length - 1, 1);
  const py   = (v: number) => pad.t + gH - (v / maxV) * gH;
  const pts  = chartData.map((d, i) => ({ x: px(i), y: py(d.amount) }));
  let line   = pts.length > 0 ? `M${pts[0].x},${pts[0].y}` : '';
  for (let i = 1; i < pts.length; i++) {
    const cx2 = (pts[i - 1].x + pts[i].x) / 2;
    line += ` C${cx2},${pts[i - 1].y} ${cx2},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  const area = pts.length > 0
    ? `${line} L${pts[pts.length - 1].x},${H - pad.b} L${pts[0].x},${H - pad.b} Z` : '';

  const rangeLabel = RANGES.find(r => r.key === range)?.label ?? '';

  const handleExportPDF = () => {
    const html = buildPrintHTML({
      rangeLabel, totalSales, totalExpenses, netIncome,
      expenseCatMap, distResults, avgDailySales, bestDay, worstDay,
    });
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  const tabBtnStyle = (active: boolean) => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
    border: active ? '2px solid var(--accent, #4f46e5)' : '1.5px solid var(--glass-border, rgba(255,255,255,0.2))',
    background: active ? 'var(--accent, #4f46e5)' : 'rgba(255,255,255,0.4)',
    color: active ? '#fff' : 'var(--sub)',
    fontWeight: active ? 700 : 500, fontSize: 12,
    fontFamily: 'inherit', transition: 'all .15s',
    backdropFilter: 'blur(8px)',
  } as React.CSSProperties);

  return (
    <div className="content">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-sub">View and analyze your business performance</p>
        </div>
        <button className="btn-primary" onClick={handleExportPDF}>
          <i className="ti ti-download" aria-hidden="true" /> Export PDF
        </button>
      </div>

      {/* ── Date Range Filter ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            style={{
              padding: '7px 16px', borderRadius: 8,
              border: range === r.key ? '2px solid var(--accent)' : '1.5px solid var(--glass-border)',
              background: range === r.key ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
              color: range === r.key ? '#fff' : 'var(--sub)',
              fontWeight: range === r.key ? 700 : 500,
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all .15s', backdropFilter: 'blur(8px)',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* ── Tab Navigation ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={tabBtnStyle(tab === t.key)}>
            <i className={`ti ${t.icon}`} style={{ fontSize: 13 }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Stat Cards (always visible) ── */}
      <div className="stats-row" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total Sales',    value: formatPeso(totalSales),    accent: '#4f46e5' },
          { label: 'Total Expenses', value: formatPeso(totalExpenses), accent: '#ef4444' },
          { label: 'Gross Profit',   value: formatPeso(netIncome),     accent: '#10b981' },
          { label: 'Sales Records',  value: String(filteredSales.length), accent: '#f59e0b', mono: false },
        ].map(c => (
          <div key={c.label} className="stat-card" style={{ paddingTop: 16 }}>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value" style={{ color: c.accent, fontFamily: c.mono === false ? 'inherit' : 'var(--mono)' }}>
              {c.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{rangeLabel}</div>
          </div>
        ))}
      </div>

      {/* ══════════════ OVERVIEW TAB ══════════════ */}
      {tab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="page-card">
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3, color: 'var(--text)' }}>Daily Averages</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Average per active day in range</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, padding: '14px 16px', background: 'rgba(79,70,229,0.07)', borderRadius: 10, border: '1px solid rgba(79,70,229,0.15)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>Avg Daily Sales</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#4f46e5', fontFamily: 'var(--mono)', letterSpacing: '-.5px' }}>{formatPeso(avgDailySales)}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{uniqueSaleDays} day{uniqueSaleDays !== 1 ? 's' : ''} with sales</div>
                </div>
                <div style={{ flex: 1, padding: '14px 16px', background: 'rgba(239,68,68,0.07)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.15)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>Avg Daily Expenses</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444', fontFamily: 'var(--mono)', letterSpacing: '-.5px' }}>{formatPeso(avgDailyExpenses)}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{uniqueExpenseDays} day{uniqueExpenseDays !== 1 ? 's' : ''} with expenses</div>
                </div>
              </div>
            </div>

            <div className="page-card">
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3, color: 'var(--text)' }}>Best & Worst Day</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Based on total sales by day of week</div>
              {dayEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>No sales data in range</div>
              ) : (
                <div style={{ display: 'flex', gap: 12 }}>
                  {bestDay && (
                    <div style={{ flex: 1, padding: '14px 16px', background: 'rgba(16,185,129,0.07)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <i className="ti ti-trophy" style={{ color: '#10b981', fontSize: 16 }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '.6px' }}>Best Day</span>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{DAY_NAMES[bestDay.day]}</div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--sub)', marginTop: 4 }}>{formatPeso(bestDay.total)}</div>
                    </div>
                  )}
                  {worstDay && (
                    <div style={{ flex: 1, padding: '14px 16px', background: 'rgba(239,68,68,0.07)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.15)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <i className="ti ti-trending-down" style={{ color: '#ef4444', fontSize: 16 }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '.6px' }}>Worst Day</span>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#ef4444' }}>{DAY_NAMES[worstDay.day]}</div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--sub)', marginTop: 4 }}>{formatPeso(worstDay.total)}</div>
                    </div>
                  )}
                  {dayEntries.length === 1 && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>
                      Need more days to compare
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 16 }}>
            <div className="page-card">
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Sales Trend</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
                Last {chartData.length} entr{chartData.length === 1 ? 'y' : 'ies'} in range
              </div>
              {chartData.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: H, color: 'var(--muted)', gap: 8 }}>
                  <i className="ti ti-chart-line" style={{ fontSize: 36, opacity: .3 }} />
                  <div style={{ fontSize: 13 }}>No sales data for this period</div>
                </div>
              ) : (
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
                  {chartData.map((d, i) => (
                    <text key={i} x={px(i)} y={H - pad.b + 14} textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="Plus Jakarta Sans">
                      {d.displayDate.split(', ')[0].split(' ').slice(0, 2).join(' ')}
                    </text>
                  ))}
                </svg>
              )}
            </div>

            <div className="page-card">
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Total Distribution</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Breakdown from gross profit</div>
              {distResults.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{r.name} ({r.percentage}%)</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: r.color }}>
                    {formatPeso(r.amount)}
                  </span>
                </div>
              ))}
              {/* FIX: show actual totalDistributed, not totalSales */}
              <div style={{ borderTop: '1.5px solid var(--border)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Total</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>{formatPeso(totalDistributed)}</span>
              </div>
            </div>
          </div>

          <div className="page-card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Top Expense Categories</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              Where your money is going — {rangeLabel.toLowerCase()}
            </div>
            {filteredExpenses.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 0', color: 'var(--muted)', gap: 8 }}>
                <i className="ti ti-receipt-off" style={{ fontSize: 36, opacity: .3 }} />
                <div style={{ fontSize: 13 }}>No expenses recorded for this period</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 28, alignItems: 'center' }}>
                <DonutChart slices={expenseSlices} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {expenseSlices.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.3)', borderRadius: 9, border: '1px solid var(--glass-border)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
                        <div style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, color: s.color, marginTop: 2 }}>{formatPeso(s.value)}</div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>
                        {Math.round((s.value / totalExpenses) * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════ P&L TAB ══════════════ */}
      {tab === 'pnl' && (
        <div className="page-card" style={{ marginBottom: 16 }}>
          <PnLTable
            totalSales={totalSales}
            totalExpenses={totalExpenses}
            expenseCatMap={expenseCatMap}
            distResults={distResults}
            rangeLabel={rangeLabel}
            onExportPDF={handleExportPDF}
          />
        </div>
      )}

      {/* ══════════════ FORECAST TAB ══════════════ */}
      {tab === 'forecast' && (
        <div className="page-card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>30-Day Sales Forecast</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
            Linear projection based on your historical sales data
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 3, background: '#4f46e5', borderRadius: 2 }} />
              <span style={{ fontSize: 11, color: 'var(--sub)' }}>Historical</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 3, background: '#10b981', borderRadius: 2, backgroundImage: 'repeating-linear-gradient(90deg,#10b981 0,#10b981 6px,transparent 6px,transparent 9px)' }} />
              <span style={{ fontSize: 11, color: 'var(--sub)' }}>Forecast (30 days)</span>
            </div>
          </div>
          <ForecastChart salesData={filteredSales} forecastDays={30} />
          <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(16,185,129,0.06)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.15)', fontSize: 12, color: 'var(--sub)', lineHeight: 1.6 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 6, color: '#10b981' }} />
            This forecast uses linear regression on your {rangeLabel.toLowerCase()} data. Actual results may vary based on seasonal trends, promotions, and external factors.
          </div>
        </div>
      )}

      {/* ══════════════ TRENDS TAB ══════════════ */}
      {tab === 'trends' && (
        <>
          <div className="page-card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Sales vs Expense Trend</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              Compare revenue and costs over time — spot where expenses are creeping up
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 24, height: 3, background: '#4f46e5', borderRadius: 2 }} />
                <span style={{ fontSize: 11, color: 'var(--sub)' }}>Sales</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 24, height: 3, background: '#ef4444', borderRadius: 2, backgroundImage: 'repeating-linear-gradient(90deg,#ef4444 0,#ef4444 5px,transparent 5px,transparent 8px)' }} />
                <span style={{ fontSize: 11, color: 'var(--sub)' }}>Expenses</span>
              </div>
            </div>
            <DualTrendChart salesData={filteredSales} expenseData={filteredExpenses} />
          </div>

          <div className="page-card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Expense Category Breakdown</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Relative share of each cost category</div>
            {Object.entries(expenseCatMap).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--muted)', fontSize: 13 }}>
                No expenses for this period
              </div>
            ) : (
              Object.entries(expenseCatMap)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amt], i) => {
                  const pctW = totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0;
                  const color = DONUT_COLORS[i % DONUT_COLORS.length];
                  return (
                    <div key={cat} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{cat}</span>
                        <span style={{ fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700, color }}>
                          {formatPeso(amt)} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>({pctW.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div style={{ height: 7, borderRadius: 4, background: 'var(--border, rgba(0,0,0,0.08))' }}>
                        <div style={{ height: '100%', width: `${pctW}%`, background: color, borderRadius: 4, transition: 'width .4s ease' }} />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;