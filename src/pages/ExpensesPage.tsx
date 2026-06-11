import React, { useState, useMemo } from 'react';
import { ExpenseRecord, ExpenseCategory } from '../types';
import { formatPeso, isoToDisplay, todayIso } from '../utils/helpers';
import Pagination from '../components/shared/Pagination';
import Modal      from '../components/shared/Modal';

interface ExpensesPageProps {
  records:   ExpenseRecord[];
  onAdd:     (e: Omit<ExpenseRecord, 'id'>) => void;
  onDelete:  (id: string) => void;   // ← add this
  canAdd:    boolean;
  canDelete: boolean;
}

const CATEGORIES: ExpenseCategory[] = [
  'Office Supplies', 'Supplies', 'Utilities',
  'Transportation',  'Maintenance', 'Other',
];

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  'Office Supplies': { bg: '#dbeafe', color: '#1d4ed8' },
  'Supplies':        { bg: '#ede9fe', color: '#6d28d9' },
  'Utilities':       { bg: '#fef3c7', color: '#b45309' },
  'Transportation':  { bg: '#cffafe', color: '#0e7490' },
  'Maintenance':     { bg: '#fee2e2', color: '#dc2626' },
  'Other':           { bg: '#f1f5f9', color: '#475569' },
};

const PER = 8;

const ExpensesPage: React.FC<ExpensesPageProps> = ({
  records, onAdd, onDelete, canAdd, canDelete,
}) => {
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [page,      setPage]      = useState(1);
  const [modal,     setModal]     = useState(false);
  const [deleting,  setDeleting]  = useState<string | null>(null);  // ← track deleting state
  const [confirmId, setConfirmId] = useState<string | null>(null);  // ← confirm before delete
  const [form, setForm] = useState({
    description: '',
    category:    'Office Supplies' as ExpenseCategory,
    amount:      '',
    date:        todayIso(),
  });

  const filtered = useMemo(
    () => records.filter(r =>
      r.description?.toLowerCase().includes(search.toLowerCase()) &&
      (catFilter === 'All' || r.category === catFilter)
    ),
    [records, search, catFilter]
  );

  const totalPages    = Math.ceil(filtered.length / PER);
  const rows          = filtered.slice((page - 1) * PER, page * PER);
  const todayExpTotal = records.filter(r => r.date === todayIso()).reduce((s, r) => s + r.amount, 0);
  const monthTotal    = records.reduce((s, r) => s + r.amount, 0);

  const handleSave = () => {
    if (!form.description || !form.amount) return;
    onAdd({
      date:        form.date,
      displayDate: isoToDisplay(form.date),
      description: form.description,
      category:    form.category,
      amount:      Math.abs(parseFloat(form.amount)),
      addedBy:     'Admin',
    });
    setForm({ description: '', category: 'Office Supplies', amount: '', date: todayIso() });
    setModal(false);
  };

  // ── Handle delete with confirmation ──────────────────────
  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await onDelete(id);
    } finally {
      setDeleting(null);
      setConfirmId(null);
    }
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-sub">Track and manage all business expenses</p>
        </div>
        {canAdd && (
          <button className="btn-primary" onClick={() => setModal(true)}>
            <i className="ti ti-plus" aria-hidden="true" /> Add Expense
          </button>
        )}
      </div>

      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[
          { label: 'Expenses Today',   value: formatPeso(todayExpTotal), accent: '#ef4444' },
          { label: 'Total This Month', value: formatPeso(monthTotal),    accent: '#f97316' },
          { label: 'Total Records',    value: String(records.length),    accent: '#8b5cf6', mono: false },
        ].map(c => (
          <div key={c.label} className="stat-card" style={{ borderTop: `3px solid ${c.accent}`, paddingTop: 16 }}>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value" style={{ fontFamily: c.mono === false ? 'inherit' : 'var(--mono)' }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div className="page-card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 15 }} aria-hidden="true" />
            <input className="search-input" placeholder="Search expenses..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="filter-select" value={catFilter}
            onChange={e => { setCatFilter(e.target.value); setPage(1); }}>
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="page-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th><th>Date</th><th>Category</th><th>Description</th>
              <th className="right">Amount</th><th>Added By</th>
              {canDelete && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const cc = CAT_COLORS[r.category] ?? CAT_COLORS['Other'];
              const isDeleting = deleting === r.id;
              const isConfirming = confirmId === r.id;

              return (
                <tr key={r.id} style={{ opacity: isDeleting ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{(page - 1) * PER + i + 1}</td>
                  <td style={{ color: 'var(--sub)' }}>{r.displayDate}</td>
                  <td>
                    <span className="cat-badge" style={{ background: cc.bg, color: cc.color }}>
                      {r.category}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{r.description}</td>
                  <td className="right mono" style={{ color: 'var(--red)', fontWeight: 700 }}>
                    {formatPeso(r.amount)}
                  </td>
                  <td style={{ color: 'var(--sub)' }}>{r.addedBy}</td>
                  {canDelete && (
                    <td>
                      {isConfirming ? (
                        // ── Confirm row ──
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={isDeleting}
                            style={{
                              padding: '4px 10px', fontSize: 11, fontWeight: 600,
                              background: '#dc2626', color: '#fff',
                              border: 'none', borderRadius: 6, cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            {isDeleting ? '...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            style={{
                              padding: '4px 10px', fontSize: 11, fontWeight: 600,
                              background: 'var(--bg)', color: 'var(--sub)',
                              border: '1px solid var(--border)', borderRadius: 6,
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        // ── Delete button ──
                        <button
                          aria-label={`Delete ${r.description}`}
                          onClick={() => setConfirmId(r.id)}
                          style={{
                            width: 30, height: 30,
                            border: '1px solid #fecaca', background: '#fee2e2',
                            color: '#dc2626', borderRadius: 7, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14,
                          }}
                        >
                          <i className="ti ti-trash" aria-hidden="true" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={canDelete ? 7 : 6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0' }}>
                  No expenses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} total={filtered.length} perPage={PER} onPage={setPage} />
      </div>

      {/* Add Expense Modal */}
      {modal && canAdd && (
        <Modal title="Add Expense" onClose={() => setModal(false)}>
          <label className="form-label">Description</label>
          <input className="form-input" placeholder="e.g. Bond Paper (A4)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

          <label className="form-label" style={{ marginTop: 12 }}>Category</label>
          <select className="form-input" value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>

          <label className="form-label" style={{ marginTop: 12 }}>Amount (₱)</label>
          <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />

          <label className="form-label" style={{ marginTop: 12 }}>Date</label>
          <input className="form-input" type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={handleSave}>Save Expense</button>
            <button className="btn-ghost"   style={{ flex: 1 }} onClick={() => setModal(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ExpensesPage;