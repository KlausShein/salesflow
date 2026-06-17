import React, { useState, useCallback, useEffect } from 'react';
import { SalesRecord, ExpenseRecord, DistributionCategory } from '../types';
import { formatPeso, computeDistribution, computeDashboardStats, todayIso } from '../utils/helpers';
import AnalyticsPanel from '../components/dashboard/AnalyticsPanel';
import FloatingRobot from '../components/shared/FloatingRobot';
import DatePicker from '../components/shared/DatePicker';

// ─── Modal Styles (injected once) ────────────────────────────
const MODAL_STYLES = `
  @keyframes backdropIn {
    from { background: rgba(0,0,0,0); backdrop-filter: blur(0px); }
    to   { background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); }
  }
  @keyframes modalPop {
    from { opacity: 0; transform: scale(0.92) translateY(20px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }
  @keyframes rowFade {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .vam-row  { animation: rowFade 0.2s ease both; transition: background 0.14s; }
  .vam-row:hover { background: rgba(255,255,255,0.055) !important; }
  .vam-chip { cursor: pointer; transition: all 0.15s; }
  .vam-chip:hover { opacity: 0.8; }
  .vam-close:hover { background: rgba(255,255,255,0.12) !important; color: #f1f5f9 !important; }
  .vam-input:focus { border-color: rgba(99,102,241,0.5) !important; outline: none; }
  .vam-scroll::-webkit-scrollbar { width: 4px; }
  .vam-scroll::-webkit-scrollbar-track { background: transparent; }
  .vam-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
`;

// ─── Reusable Centered Modal Shell ────────────────────────────
interface ModalShellProps {
  isOpen:      boolean;
  onClose:     () => void;
  title:       string;
  subtitle:    string;
  icon:        string;
  accent:      string;
  accentDim:   string;
  children:    React.ReactNode;
}
const ModalShell: React.FC<ModalShellProps> = ({
  isOpen, onClose, title, subtitle, icon, accent, accentDim, children,
}) => {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <style>{MODAL_STYLES}</style>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          animation: 'backdropIn 0.22s ease forwards',
        }}
        aria-hidden="true"
      />
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 1001,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px 16px', pointerEvents: 'none',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          style={{
            pointerEvents:  'auto',
            width:          '100%',
            maxWidth:       680,
            maxHeight:      '82vh',
            display:        'flex',
            flexDirection:  'column',
            background:     'linear-gradient(165deg, #1d2235 0%, #141824 100%)',
            border:         '1px solid rgba(255,255,255,0.09)',
            borderRadius:   22,
            boxShadow:      '0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.07)',
            animation:      'modalPop 0.28s cubic-bezier(0.34,1.4,0.64,1) forwards',
            overflow:       'hidden',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '22px 26px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 13,
              background: accentDim, color: accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>
              <i className={`ti ${icon}`} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px' }}>{title}</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{subtitle}</div>
            </div>
            <button
              className="vam-close"
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#475569', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, transition: 'all 0.15s', flexShrink: 0,
              }}
            >
              <i className="ti ti-x" />
            </button>
          </div>
          <div className="vam-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 26px 28px' }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Shared: Search bar ───────────────────────────────────────
const VamSearch: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => (
  <div style={{ position: 'relative', margin: '18px 0 14px' }}>
    <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: 15, pointerEvents: 'none' }} />
    <input
      className="vam-input"
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 14px 10px 37px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 11, color: '#e2e8f0', fontSize: 13,
        boxSizing: 'border-box', transition: 'border-color 0.2s',
      }}
    />
    {value && (
      <button onClick={() => onChange('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14 }}>
        <i className="ti ti-x" />
      </button>
    )}
  </div>
);

// ─── Shared: Summary strip ────────────────────────────────────
const VamSummary: React.FC<{ items: { label: string; value: string; color: string; bg: string }[] }> = ({ items }) => (
  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
    {items.map(it => (
      <div key={it.label} style={{ flex: 1, padding: '11px 14px', background: it.bg, borderRadius: 11 }}>
        <div style={{ fontSize: 10, color: it.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>{it.label}</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: it.color, letterSpacing: '-0.5px', lineHeight: 1 }}>{it.value}</div>
      </div>
    ))}
  </div>
);

// ─── Shared: Empty state ──────────────────────────────────────
const VamEmpty: React.FC<{ msg: string }> = ({ msg }) => (
  <div style={{ textAlign: 'center', padding: '52px 0', color: '#334155' }}>
    <i className="ti ti-database-off" style={{ fontSize: 40, display: 'block', marginBottom: 10, opacity: 0.45 }} />
    <div style={{ fontSize: 14 }}>{msg}</div>
  </div>
);

// ─── Row number badge ─────────────────────────────────────────
const RowNum: React.FC<{ n: number; color: string; bg: string }> = ({ n, color, bg }) => (
  <div style={{ width: 26, height: 26, borderRadius: 7, background: bg, color, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    {n}
  </div>
);

// ─── Sales Modal ──────────────────────────────────────────────
const SalesModal: React.FC<{ isOpen: boolean; onClose: () => void; sales: SalesRecord[] }> = ({ isOpen, onClose, sales }) => {
  const [q, setQ] = useState('');
  const filtered = sales.filter(s =>
    !q ||
    s.displayDate.toLowerCase().includes(q.toLowerCase()) ||
    (s.notes ?? '').toLowerCase().includes(q.toLowerCase()) ||
    String(s.amount).includes(q)
  );
  const totalSales = filtered.reduce((n, s) => n + s.amount, 0);
  const totalDist  = filtered.reduce((n, s) => n + s.distributed, 0);

  return (
    <ModalShell
      isOpen={isOpen} onClose={onClose}
      title="All Sales Records"
      subtitle={`${sales.length} total record${sales.length !== 1 ? 's' : ''}`}
      icon="ti-trending-up" accent="#818cf8" accentDim="rgba(99,102,241,0.14)"
    >
      <VamSearch value={q} onChange={setQ} placeholder="Search by date, notes, or amount…" />
      {filtered.length > 0 && (
        <VamSummary items={[
          { label: 'Total Sales',       value: formatPeso(totalSales),  color: '#818cf8', bg: 'rgba(99,102,241,0.12)'  },
          { label: 'Total Distributed', value: formatPeso(totalDist),   color: '#34d399', bg: 'rgba(5,150,105,0.12)'   },
          { label: 'Records',           value: String(filtered.length), color: '#94a3b8', bg: 'rgba(255,255,255,0.04)' },
        ]} />
      )}
      {filtered.length === 0 ? (
        <VamEmpty msg={q ? 'No records match your search' : 'No sales records yet'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((s, i) => (
            <div key={s.id} className="vam-row" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 11, cursor: 'default', animationDelay: `${Math.min(i * 0.025, 0.3)}s` }}>
              <RowNum n={i + 1} color="#818cf8" bg="rgba(99,102,241,0.14)" />
              <div style={{ flexShrink: 0, width: 105 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{s.displayDate}</div>
                <div style={{ fontSize: 11, color: '#334155', marginTop: 1 }}>{s.date}</div>
              </div>
              <div style={{ flex: 1, fontSize: 13, color: s.notes ? '#64748b' : '#1e293b', fontStyle: s.notes ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.notes || 'No notes'}
              </div>
              <div style={{ fontSize: 11, color: '#34d399', flexShrink: 0 }}>dist. {formatPeso(s.distributed)}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#818cf8', letterSpacing: '-0.3px', flexShrink: 0, minWidth: 86, textAlign: 'right' }}>{formatPeso(s.amount)}</div>
              <div style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: '0.2px', flexShrink: 0, background: s.status === 'Completed' ? 'rgba(5,150,105,0.15)' : 'rgba(245,158,11,0.15)', color: s.status === 'Completed' ? '#34d399' : '#fbbf24', border: `1px solid ${s.status === 'Completed' ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)'}` }}>
                {s.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
};

// ─── Expenses Modal ───────────────────────────────────────────
const ExpensesModal: React.FC<{ isOpen: boolean; onClose: () => void; expenses: ExpenseRecord[] }> = ({ isOpen, onClose, expenses }) => {
  const [q,   setQ]   = useState('');
  const [cat, setCat] = useState('All');
  const allCats  = ['All', ...Array.from(new Set(expenses.map(e => e.category).filter(Boolean)))];
  const filtered = expenses.filter(e => {
    const mQ = !q || (e.description ?? '').toLowerCase().includes(q.toLowerCase()) || e.displayDate.toLowerCase().includes(q.toLowerCase()) || (e.category ?? '').toLowerCase().includes(q.toLowerCase()) || String(e.amount).includes(q);
    const mC = cat === 'All' || e.category === cat;
    return mQ && mC;
  });
  const total = filtered.reduce((n, e) => n + e.amount, 0);

  return (
    <ModalShell
      isOpen={isOpen} onClose={onClose}
      title="All Expense Records"
      subtitle={`${expenses.length} total record${expenses.length !== 1 ? 's' : ''}`}
      icon="ti-receipt-2" accent="#f87171" accentDim="rgba(220,38,38,0.14)"
    >
      <VamSearch value={q} onChange={setQ} placeholder="Search by description, category, or amount…" />
      {allCats.length > 2 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {allCats.map(c => (
            <button key={c} className="vam-chip" onClick={() => setCat(c)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1px solid ${cat === c ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.07)'}`, background: cat === c ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.03)', color: cat === c ? '#f87171' : '#475569', fontWeight: cat === c ? 600 : 400 }}>
              {c}
            </button>
          ))}
        </div>
      )}
      {filtered.length > 0 && (
        <VamSummary items={[
          { label: 'Total Expenses', value: formatPeso(total),       color: '#f87171', bg: 'rgba(220,38,38,0.1)'    },
          { label: 'Records',        value: String(filtered.length), color: '#94a3b8', bg: 'rgba(255,255,255,0.04)' },
          ...(cat !== 'All' ? [{ label: 'Filter', value: cat, color: '#fbbf24', bg: 'rgba(245,158,11,0.1)' }] : []),
        ]} />
      )}
      {filtered.length === 0 ? (
        <VamEmpty msg={q || cat !== 'All' ? 'No records match your filter' : 'No expense records yet'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((e, i) => (
            <div key={e.id} className="vam-row" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 11, cursor: 'default', animationDelay: `${Math.min(i * 0.025, 0.3)}s` }}>
              <RowNum n={i + 1} color="#f87171" bg="rgba(220,38,38,0.12)" />
              <div style={{ flexShrink: 0, width: 105 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{e.displayDate}</div>
                <div style={{ fontSize: 11, color: '#334155', marginTop: 1 }}>{e.date}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description || '—'}</div>
                {e.category && <span style={{ display: 'inline-block', marginTop: 3, padding: '1px 7px', borderRadius: 6, fontSize: 10, background: 'rgba(255,255,255,0.06)', color: '#475569' }}>{e.category}</span>}
              </div>
              {e.addedBy && <div style={{ fontSize: 11, color: '#334155', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-user" style={{ fontSize: 10 }} />{e.addedBy}</div>}
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f87171', letterSpacing: '-0.3px', flexShrink: 0, minWidth: 86, textAlign: 'right' }}>{formatPeso(e.amount)}</div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
};

// ─── Main DashboardPage ───────────────────────────────────────
interface DashboardPageProps {
  sales:         SalesRecord[];
  expenses:      ExpenseRecord[];
  categories:    DistributionCategory[];
  onSaveSale:    (date: string, amount: number, notes: string) => Promise<void>;
  selectedDate?: string;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
  sales, expenses, categories, onSaveSale, selectedDate,
}) => {
  const activeDate = selectedDate ?? todayIso();

  const [salesAmount,  setSalesAmount]  = useState<string>('');
  const [entryDate,    setEntryDate]    = useState<string>(activeDate);
  const [notes,        setNotes]        = useState<string>('');
  const [saved,        setSaved]        = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState<string | null>(null);
  const [salesOpen,    setSalesOpen]    = useState(false);
  const [expensesOpen, setExpensesOpen] = useState(false);

  useEffect(() => { setEntryDate(activeDate); }, [activeDate]);

  const amount      = Math.max(0, parseFloat(salesAmount) || 0);
  const distResults = computeDistribution(amount, categories);
  const stats       = computeDashboardStats(sales, expenses, activeDate);

  const handleSave = useCallback(async () => {
    if (amount <= 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSaveSale(entryDate, amount, notes);
      setSaved(true);
      setSalesAmount('');
      setNotes('');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save sale';
      setSaveError(msg);
      console.error('[handleSave] error:', msg);
    } finally {
      setSaving(false);
    }
  }, [amount, entryDate, notes, onSaveSale]);

  const recentSales    = sales.slice(0, 5);
  const recentExpenses = expenses.slice(0, 5);

  return (
    <div className="content">

      {/* ── Stat cards ── */}
      <div className="stats-row">
        <StatCard icon="ti-trending-up" iconBg="#eef2ff" iconColor="#4f46e5" label="Total Sales Today"    value={formatPeso(stats.totalSalesToday    || 0)} change={stats.salesChangePct}    changeDir={(stats.salesChangePct    ?? 0) >= 0 ? 'up' : 'dn'} />
        <StatCard icon="ti-receipt-2"   iconBg="#fee2e2" iconColor="#dc2626" label="Total Expenses Today" value={formatPeso(stats.totalExpensesToday || 0)} change={stats.expensesChangePct} changeDir={(stats.expensesChangePct ?? 0) >= 0 ? 'dn' : 'up'} />
        <StatCard icon="ti-pig-money"   iconBg="#d1fae5" iconColor="#059669" label="Net Income Today"     value={formatPeso(stats.netIncomeToday     || 0)} change={stats.netChangePct}      changeDir={(stats.netChangePct      ?? 0) >= 0 ? 'up' : 'dn'} />
        <StatCard icon="ti-wallet"      iconBg="#fef3c7" iconColor="#d97706" label="Remaining Balance"    value={formatPeso(stats.remainingBalance   || 0)} note="After distribution & expenses" />
      </div>

      {/* ── Mid row ── */}
      <div className="mid-grid">
        <div className="entry-card">
          <div className="entry-title">Daily Sales Entry</div>
          <div className="entry-sub">Enter the total sales for {activeDate === todayIso() ? 'today' : entryDate}</div>

          <label className="form-label">Total Sales Amount</label>
          <div className="amount-wrap">
            <div className="amount-symbol">&#8369;</div>
            <input
              className="amount-input"
              type="number"
              min="0"
              step="0.01"
              value={salesAmount}
              onChange={e => setSalesAmount(e.target.value)}
              placeholder="0.00"
              aria-label="Total sales amount"
              disabled={saving}
            />
          </div>
          <div className="form-hint">Enter 0.00 if no sales today</div>

          <div className="form-row">
            {/* ── Custom date picker ── */}
            <div>
              <label className="form-label">Date</label>
              <DatePicker
                value={entryDate}
                onChange={setEntryDate}
                disabled={saving}
              />
            </div>
            <div>
              <label className="form-label">Notes (Optional)</label>
              <textarea
                className="form-input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes..."
                aria-label="Notes"
                disabled={saving}
              />
            </div>
          </div>

          {saveError && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 9, fontSize: 13, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 15, flexShrink: 0 }} />
              {saveError}
            </div>
          )}

          <button
            className={`btn-save${saved ? ' success' : ''}`}
            onClick={handleSave}
            disabled={saved || saving || amount <= 0}
          >
            <i
              className={`ti ${saving ? 'ti-loader-2' : saved ? 'ti-check' : 'ti-device-floppy'}`}
              style={{ fontSize: 16, animation: saving ? 'spin 1s linear infinite' : undefined }}
              aria-hidden="true"
            />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Sales'}
          </button>
        </div>

        <div className="dist-card">
          <div className="dist-card-title">Distribution Breakdown</div>
          <div className="dist-card-sub">Automatic computation based on percentage</div>
          {distResults.map(r => {
            const barW = Math.round(((r.percentage || 0) / 40) * 100);
            return (
              <div key={r.id} className="dist-row">
                <div className="dist-dot" style={{ background: r.color }} />
                <div className="dist-name">{r.name}</div>
                <div className="dist-pct">{r.percentage}%</div>
                <div className="dist-bar-track"><div className="dist-bar-fill" style={{ width: `${barW}%`, background: r.color }} /></div>
                <div className="dist-amount">{formatPeso(r.amount || 0)}</div>
              </div>
            );
          })}
          <div className="dist-total-row">
            <div className="dist-total-label">Total Distribution</div>
            <div className="dist-total-pct">100%</div>
            <div className="dist-full-bar"><div className="dist-full-fill" /></div>
            <div className="dist-total-val">{formatPeso(amount)}</div>
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="bottom-grid">
        <div className="table-card">
          <div className="tc-header">
            <div><div className="tc-title">Recent Sales</div><div className="tc-sub">Latest sales records</div></div>
            <button className="view-all-btn" onClick={() => setSalesOpen(true)}>
              <i className="ti ti-list" aria-hidden="true" /> View All Sales
            </button>
          </div>
          <table className="data-table" aria-label="Recent sales">
            <thead>
              <tr>
                <th>Date</th>
                <th className="right">Total Sales</th>
                <th className="right">Distributed</th>
                <th>Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px 0' }}>No sales records yet</td></tr>
              ) : recentSales.map(r => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--sub)' }}>{r.displayDate}</td>
                  <td className="right mono" style={{ color: '#4f46e5', fontWeight: 700 }}>{formatPeso(r.amount)}</td>
                  <td className="right mono" style={{ color: '#059669', fontWeight: 700 }}>{formatPeso(r.distributed)}</td>
                  <td>{r.notes ? <span style={{ color: 'var(--sub)' }}>{r.notes}</span> : <span style={{ color: 'var(--muted)' }}>&#8211;</span>}</td>
                  <td><span className="badge-done">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-card">
          <div className="tc-header">
            <div><div className="tc-title">Recent Expenses</div><div className="tc-sub">Latest expense records</div></div>
            <button className="view-all-btn" onClick={() => setExpensesOpen(true)}>
              <i className="ti ti-list" aria-hidden="true" /> View All Expenses
            </button>
          </div>
          <table className="data-table" aria-label="Recent expenses">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th className="right">Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentExpenses.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px 0' }}>No expense records yet</td></tr>
              ) : recentExpenses.map(e => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--sub)' }}>{e.displayDate}</td>
                  <td style={{ fontWeight: 500 }}>{e.description}</td>
                  <td className="right mono" style={{ color: 'var(--red)', fontWeight: 700 }}>{formatPeso(e.amount)}</td>
                  <td><button className="action-btn" aria-label={`View ${e.description}`}><i className="ti ti-eye" aria-hidden="true" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Analytics ── */}
      <AnalyticsPanel sales={sales} expenses={expenses} />

      {/* ── Modals ── */}
      <SalesModal    isOpen={salesOpen}    onClose={() => setSalesOpen(false)}    sales={sales}       />
      <ExpensesModal isOpen={expensesOpen} onClose={() => setExpensesOpen(false)} expenses={expenses} />

      <FloatingRobot />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ─── StatCard ─────────────────────────────────────────────────
interface StatCardProps { icon: string; iconBg: string; iconColor: string; label: string; value: string; change?: number; changeDir?: 'up' | 'dn'; note?: string; }
const StatCard: React.FC<StatCardProps> = ({ icon, iconBg, iconColor, label, value, change, changeDir, note }) => (
  <div className="stat-card">
    <div className="stat-icon-wrap" style={{ background: iconBg, color: iconColor }}><i className={`ti ${icon}`} aria-hidden="true" /></div>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    {change !== undefined && changeDir && (
      <span className={`stat-change ${changeDir}`}>
        <i className={`ti ${changeDir === 'up' ? 'ti-arrow-up-right' : 'ti-arrow-down-right'}`} style={{ fontSize: 11 }} aria-hidden="true" />
        {change > 0 ? '+' : ''}{change}% from yesterday
      </span>
    )}
    {note && <div className="stat-note">{note}</div>}
  </div>
);

export default DashboardPage;