import React, { useState, useMemo } from 'react';
import { SalesRecord } from '../types';
import { formatPeso } from '../utils/helpers';
import Pagination from '../components/shared/Pagination';

interface SalesPageProps {
  records:     SalesRecord[];
  onRemove:    (id: string) => Promise<void>;
  onRemoveAll: () => Promise<void>;
  canDelete:   boolean;
  canAdd:      boolean;
}

const PER = 8;

const SalesPage: React.FC<SalesPageProps> = ({
  records, onRemove, onRemoveAll, canDelete, canAdd,
}) => {
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [confirmAll,  setConfirmAll]  = useState(false);

  const filtered = useMemo(
    () => records.filter((r) =>
      r.displayDate.toLowerCase().includes(search.toLowerCase()) ||
      r.notes.toLowerCase().includes(search.toLowerCase())
    ),
    [records, search]
  );

  const totalPages   = Math.ceil(filtered.length / PER);
  const rows         = filtered.slice((page - 1) * PER, page * PER);
  const totalRevenue = records.reduce((s, r) => s + r.amount, 0);
  const avgDaily     = records.length ? totalRevenue / records.length : 0;

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try { await onRemove(id); }
    finally { setDeletingId(null); }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await onRemoveAll();
      setConfirmAll(false);
      setPage(1);
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="page-sub">All daily sales records</p>
        </div>

        {/* Only Admin sees Delete All */}
        {canDelete && (
          <button
            onClick={() => confirmAll ? handleDeleteAll() : setConfirmAll(true)}
            onBlur={() => setTimeout(() => setConfirmAll(false), 200)}
            disabled={deletingAll || records.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px',
              background: confirmAll ? '#dc2626' : '#fee2e2',
              color:      confirmAll ? '#fff'    : '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: 9, fontSize: 13, fontWeight: 700,
              cursor: records.length === 0 ? 'not-allowed' : 'pointer',
              opacity: records.length === 0 ? 0.5 : 1,
              transition: 'all .18s', fontFamily: 'inherit',
            }}
          >
            <i
              className={`ti ${deletingAll ? 'ti-loader-2' : 'ti-trash'}`}
              style={{ fontSize: 15, animation: deletingAll ? 'spin 1s linear infinite' : 'none' }}
              aria-hidden="true"
            />
            {deletingAll ? 'Deleting...' : confirmAll ? 'Confirm Delete All?' : 'Delete All Data'}
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[
          { label: 'Total Revenue', value: formatPeso(totalRevenue), accent: '#4f46e5' },
          { label: 'Average Daily', value: formatPeso(avgDaily),     accent: '#10b981' },
          { label: 'Total Entries', value: String(records.length),   accent: '#f59e0b', mono: false },
        ].map((c) => (
          <div key={c.label} className="stat-card" style={{ paddingTop: 16 }}>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value" style={{ fontFamily: c.mono === false ? 'inherit' : 'var(--mono)' }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="page-card" style={{ marginBottom: 14 }}>
        <div style={{ position: 'relative', maxWidth: 380 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 15 }} aria-hidden="true" />
          <input
            className="search-input"
            placeholder="Search by date or notes..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="page-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th className="right">Total Sales</th>
              <th className="right">Distributed</th>
              <th>Notes</th>
              <th>Status</th>
              {canDelete && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{(page - 1) * PER + i + 1}</td>
                <td style={{ color: 'var(--sub)' }}>{r.displayDate}</td>
                <td className="right mono" style={{ color: '#4f46e5', fontWeight: 700 }}>{formatPeso(r.amount)}</td>
                <td className="right mono" style={{ color: '#059669', fontWeight: 700 }}>{formatPeso(r.distributed)}</td>
                <td style={{ color: 'var(--sub)' }}>{r.notes || '–'}</td>
                <td><span className="badge-done">{r.status}</span></td>
                {canDelete && (
                  <td>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      aria-label={`Delete ${r.displayDate}`}
                      style={{
                        width: 30, height: 30,
                        border: '1px solid #fecaca', background: '#fee2e2',
                        color: '#dc2626', borderRadius: 7, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, transition: 'background .15s',
                        opacity: deletingId === r.id ? 0.6 : 1,
                      }}
                    >
                      <i
                        className={`ti ${deletingId === r.id ? 'ti-loader-2' : 'ti-trash'}`}
                        style={{ animation: deletingId === r.id ? 'spin 1s linear infinite' : 'none' }}
                        aria-hidden="true"
                      />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} total={filtered.length} perPage={PER} onPage={setPage} />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default SalesPage;