import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { SalesRecord, ExpenseRecord } from '../../types';
import { formatPeso } from '../../utils/helpers';

interface AnalyticsPanelProps {
  sales:    SalesRecord[];
  expenses: ExpenseRecord[];
}

type Tab = 'trend' | 'peak' | 'ai';

const isoToLabel = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const dayName = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });

const pct = (a: number, b: number) =>
  b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / Math.abs(b)) * 100);

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ sales, expenses }) => {
  const [tab,       setTab]       = useState<Tab>('trend');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('');

  const last14 = useMemo(() => {
    const sorted = [...sales].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-14);
  }, [sales]);

  const last7 = last14.slice(-7);

  const trendData = last7.map(s => ({ label: isoToLabel(s.date), amount: s.amount }));

  const avg7 = last7.length
    ? Math.round(last7.reduce((s, r) => s + r.amount, 0) / last7.length) : 0;

  const prev7    = last14.slice(0, 7);
  const avg7prev = prev7.length
    ? Math.round(prev7.reduce((s, r) => s + r.amount, 0) / prev7.length) : 0;

  const weekChangePct = pct(avg7, avg7prev);
  const bestDay = last7.reduce(
    (best, r) => r.amount > best.amount ? r : best,
    last7[0] ?? { amount: 0, date: '' }
  );

  const peakDays = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    sales.forEach(s => {
      const day = dayName(s.date);
      if (!map[day]) map[day] = { total: 0, count: 0 };
      map[day].total += s.amount;
      map[day].count += 1;
    });
    return Object.entries(map)
      .map(([day, { total, count }]) => ({ day, avg: Math.round(total / count) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 7);
  }, [sales]);

  const maxPeak = peakDays[0]?.avg ?? 1;

  const linearPrediction = useMemo(() => {
    if (last7.length < 3) return null;
    const n   = last7.length;
    const xs  = last7.map((_, i) => i);
    const ys  = last7.map(r => r.amount);
    const sx  = xs.reduce((a, b) => a + b, 0);
    const sy  = ys.reduce((a, b) => a + b, 0);
    const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const sxx = xs.reduce((a, x) => a + x * x, 0);
    const slope     = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    const intercept = (sy - slope * sx) / n;
    return Math.max(0, Math.round(intercept + slope * n));
  }, [last7]);

  const forecastData = useMemo(() => {
    if (!linearPrediction || last7.length < 2) return [];
    const lastAmt = last7[last7.length - 1]?.amount ?? 0;
    const step    = (linearPrediction - lastAmt) / 7;
    return Array.from({ length: 7 }, (_, i) => ({
      label:    `Day ${i + 1}`,
      forecast: Math.max(0, Math.round(lastAmt + step * (i + 1))),
    }));
  }, [linearPrediction, last7]);

  // ── AI insight via Gemini API ────────────────────────────
  const fetchAiInsight = async () => {
  setAiLoading(true);
  setAiInsight('');
  try {
    const summary     = last14.map(s => `${s.date}: ₱${s.amount}`).join(', ');
    const peakSummary = peakDays.slice(0, 3).map(p => `${p.day} (avg ₱${p.avg})`).join(', ');

    const prompt = `You are a business analytics assistant for a print shop.
Analyze this sales data and give a 2-3 sentence actionable insight.
Be specific with peso amounts. Keep it concise and practical.

Last 14 days sales: ${summary}
Peak days: ${peakSummary}
Linear prediction for tomorrow: ₱${linearPrediction ?? 'N/A'}
7-day average: ₱${avg7}
Week-over-week change: ${weekChangePct > 0 ? '+' : ''}${weekChangePct}%

Give insight about trends, best days, and one specific recommendation.`;

    const response = await fetch('http://localhost:3001/api/ai-insight', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ prompt }),
    });

    const data = await response.json();

    // Server sends text even on error (503) so always show it
    setAiInsight(
      data.text ||
      data.error ||
      'No insight returned. Try again later.'
    );
  } catch {
    setAiInsight('Cannot reach the AI server. Make sure it is running on port 3001.');
  } finally {
    setAiLoading(false);
  }
};

const handleAitab = () => {
  setTab('ai');
  if (!aiInsight && !aiLoading) fetchAiInsight();
};

  // ── Tooltip formatters ───────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salesFormatter = (value: any): [string, string] =>
    [formatPeso(Number(Array.isArray(value) ? value[0] : value ?? 0)), 'Sales'];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const forecastFormatter = (value: any): [string, string] =>
    [formatPeso(Number(Array.isArray(value) ? value[0] : value ?? 0)), 'Forecast'];

  return (
    <div style={styles.container}>

      {/* Header */}
      <div style={styles.header}>
  <div>
    <div style={styles.title}>Analytics & Predictions</div>
    <div style={styles.sub}>Trends, peak days, and AI forecasting</div>
  </div>

  <div style={styles.tabs}>
    {(['trend', 'peak', 'ai'] as Tab[]).map(t => (
      <button
        key={t}
        style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
        onClick={t === 'ai' ? handleAitab : () => setTab(t)}
      >
        {t === 'trend' ? (
          <>
            <i
              className="ti ti-chart-line"
              style={{ marginRight: 6 }}
            />
            Trend
          </>
        ) : t === 'peak' ? (
          <>
            <i
              className="ti ti-calendar-stats"
              style={{ marginRight: 6 }}
            />
            Peak Days
          </>
        ) : (
          <>
            <i
              className="ti ti-sparkles"
              style={{ marginRight: 6 }}
            />
            AI Insight
          </>
        )}
      </button>
    ))}
  </div>
</div>

      {/* Trend Tab */}
      {tab === 'trend' && (
        <div>
          <div style={styles.metricRow}>
            <Metric label="7-day average" value={formatPeso(avg7)}
              sub={`${weekChangePct >= 0 ? '+' : ''}${weekChangePct}% vs prev week`}
              subColor={weekChangePct >= 0 ? '#15803d' : '#dc2626'} />
            <Metric label="Best day" value={formatPeso(bestDay?.amount ?? 0)}
              sub={bestDay?.date ? isoToLabel(bestDay.date) : '—'} />
            <Metric label="Linear prediction" value={formatPeso(linearPrediction ?? 0)}
              sub="Tomorrow (model)" subColor="#7F77DD" />
          </div>
          <div style={styles.chartLabel}>Sales — last 7 days</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(Number(v) / 1000).toFixed(0)}k`} />
              <Tooltip formatter={salesFormatter} />
              <Bar dataKey="amount" fill="#7F77DD" radius={[4, 4, 0, 0]} />
              {avg7 > 0 && (
                <ReferenceLine y={avg7} stroke="#EF9F27" strokeDasharray="4 2"
                  label={{ value: 'avg', fontSize: 10, fill: '#EF9F27' }} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Peak Days Tab */}
      {tab === 'peak' && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--sub, #6b7db3)', marginBottom: 16 }}>
            Average sales by day of week (all-time)
          </div>
          {peakDays.length === 0 ? (
            <div style={{ color: '#6b7280', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
              Not enough data yet — add more sales records.
            </div>
          ) : (
            peakDays.map((p, i) => (
              <div key={p.day} style={styles.peakRow}>
                <div style={styles.peakLabel}>{p.day.slice(0, 3)}</div>
                <div style={styles.peakTrack}>
                  <div style={{
                    ...styles.peakFill,
                    width:      `${Math.round((p.avg / maxPeak) * 100)}%`,
                    background: i === 0 ? '#7F77DD' : i === 1 ? '#1D9E75' : '#378ADD',
                  }} />
                </div>
                <div style={styles.peakVal}>{formatPeso(p.avg)}</div>
              </div>
            ))
          )}
          {peakDays.length > 0 && (
            <div style={styles.peakNote}>
              💡 Best day to push promotions:{' '}
              <strong>{peakDays[peakDays.length - 1]?.day}</strong> (lowest traffic)
            </div>
          )}
        </div>
      )}

      {/* AI Prediction Tab */}
      {tab === 'ai' && (
        <div>
          <div style={styles.metricRow}>
            <Metric label="Tomorrow (AI)" value={formatPeso(linearPrediction ?? 0)}
              subColor="#7F77DD" sub="Linear forecast" />
            <Metric label="7-day forecast"
              value={formatPeso(forecastData.reduce((s, d) => s + d.forecast, 0))}
              sub="Projected total" />
            <Metric label="Trend" value={`${weekChangePct >= 0 ? '+' : ''}${weekChangePct}%`}
              sub="vs last week" subColor={weekChangePct >= 0 ? '#15803d' : '#dc2626'} />
          </div>

          <div style={styles.aiBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={styles.aiLabel}>✨ AI insight</div>
              <button
                onClick={() => { setAiInsight(''); fetchAiInsight(); }}
                disabled={aiLoading}
                style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 6,
                  background: '#ede9fe', color: '#7F77DD',
                  border: '1px solid #c4b5fd', cursor: aiLoading ? 'not-allowed' : 'pointer',
                  opacity: aiLoading ? 0.6 : 1, fontFamily: 'inherit',
                }}
              >
                {aiLoading ? 'Loading...' : '↻ Refresh'}
              </button>
            </div>
            {aiLoading ? (
              <div style={{ fontSize: 13, color: '#6b7280' }}>Analyzing your sales data...</div>
            ) : aiInsight ? (
              <div style={styles.aiText}>{aiInsight}</div>
            ) : (
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                Click <strong>↻ Refresh</strong> to generate AI insight.
              </div>
            )}
          </div>

          {forecastData.length > 0 && (
            <>
              <div style={{ ...styles.chartLabel, marginTop: 16 }}>7-day forecast</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={forecastData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(Number(v) / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={forecastFormatter} />
                  <Line type="monotone" dataKey="forecast" stroke="#7F77DD"
                    strokeDasharray="5 3" strokeWidth={2} dot={{ fill: '#7F77DD', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}

          <div style={styles.disclaimer}>
            AI predictions are estimates based on historical trends. Actual results may vary.
          </div>
        </div>
      )}
    </div>
  );
};

const Metric: React.FC<{
  label: string; value: string; sub?: string; subColor?: string;
}> = ({ label, value, sub, subColor }) => (
  <div style={styles.metric}>
    <div style={styles.metricLabel}>{label}</div>
    <div style={styles.metricVal}>{value}</div>
    {sub && <div style={{ ...styles.metricSub, color: subColor ?? '#6b7280' }}>{sub}</div>}
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  container: {
    background:     'var(--glass, rgba(255,255,255,0.55))',
    backdropFilter: 'blur(14px)',
    border:         '1px solid var(--glass-border, rgba(255,255,255,0.35))',
    borderRadius:   12,
    padding:        '20px 24px',
    marginTop:      20,
  },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  title:     { fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 2 },
  sub:       { fontSize: 13, color: '#6b7280' },
  tabs:      { display: 'flex', gap: 4, background: 'rgba(243,244,246,0.7)', padding: 4, borderRadius: 8 },
  tab:       { padding: '6px 12px', border: 'none', background: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#6b7280', fontWeight: 500, whiteSpace: 'nowrap' },
  tabActive: { background: 'rgba(255,255,255,0.9)', color: '#111827', border: '0.5px solid rgba(0,0,0,0.1)' },
  metricRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 },
  metric:    { background: 'rgba(249,250,251,0.7)', borderRadius: 8, padding: '12px 14px' },
  metricLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  metricVal:   { fontSize: 17, fontWeight: 600, color: '#111827' },
  metricSub:   { fontSize: 11, marginTop: 3 },
  chartLabel:  { fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: 500 },
  peakRow:   { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  peakLabel: { fontSize: 12, color: '#6b7280', minWidth: 30, fontWeight: 500 },
  peakTrack: { flex: 1, height: 8, background: 'rgba(243,244,246,0.8)', borderRadius: 4, overflow: 'hidden' },
  peakFill:  { height: '100%', borderRadius: 4, transition: 'width 0.4s ease' },
  peakVal:   { fontSize: 12, color: '#111827', minWidth: 70, textAlign: 'right', fontWeight: 500 },
  peakNote:  { marginTop: 16, padding: '10px 14px', background: 'rgba(255,251,235,0.8)', borderRadius: 8, fontSize: 12, color: '#92400e', border: '1px solid #fde68a' },
  aiBox:     { background: 'rgba(245,243,255,0.85)', borderRadius: 8, padding: '14px 16px', borderLeft: '3px solid #7F77DD', marginBottom: 4 },
  aiLabel:   { fontSize: 11, fontWeight: 600, color: '#7F77DD', marginBottom: 8 },
  aiText:    { fontSize: 13, color: '#1f2937', lineHeight: 1.6 },
  disclaimer: { marginTop: 12, fontSize: 11, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center' },
};

export default AnalyticsPanel;