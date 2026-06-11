import React, { useState, useMemo } from 'react';
import { Customer } from '../types';
import { formatPeso } from '../utils/helpers';
import Pagination from '../components/shared/Pagination';
import Modal from '../components/shared/Modal';
import ActionBtns from '../components/shared/ActionBtns';

interface CustomersPageProps {
  customers: Customer[];
  onAdd:     (c: Omit<Customer, 'id'>) => void;
  canAdd:    boolean;   // ← added
}

const PER = 8;

const CustomersPage: React.FC<CustomersPageProps> = ({ customers, onAdd, canAdd }) => {
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState({ name: '', phone: '', email: '' });

  const filtered = useMemo(() =>
    customers.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    ), [customers, search]);

  const totalPages = Math.ceil(filtered.length / PER);
  const rows       = filtered.slice((page - 1) * PER, page * PER);

  const handleSave = () => {
    if (!form.name || !form.phone || !form.email) return;
    onAdd({ name: form.name, phone: form.phone, email: form.email, totalPurchases: 0 });
    setForm({ name: '', phone: '', email: '' });
    setModal(false);
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-sub">Manage your customer information</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setModal(true)}
          disabled={!canAdd}
          style={{ opacity: canAdd ? 1 : 0.5, cursor: canAdd ? 'pointer' : 'not-allowed' }}
        >
          <i className="ti ti-plus" aria-hidden="true" /> Add Customer
        </button>
      </div>

      <div className="page-card" style={{ marginBottom: 14 }}>
        <div style={{ position: 'relative', maxWidth: 380 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 15 }} aria-hidden="true" />
          <input
            className="search-input"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="page-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th className="right">Total Purchases</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={c.id}>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{(page - 1) * PER + i + 1}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--accent-light)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
                    }}>
                      {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--sub)' }}>{c.phone}</td>
                <td style={{ color: 'var(--accent)' }}>{c.email}</td>
                <td className="right mono" style={{ color: 'var(--green)', fontWeight: 700 }}>
                  {formatPeso(c.totalPurchases)}
                </td>
                <td><ActionBtns onEdit={() => {}} onDelete={() => {}} /></td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0' }}>
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} total={filtered.length} perPage={PER} onPage={setPage} />
      </div>

      {modal && canAdd && (
        <Modal title="Add Customer" onClose={() => setModal(false)}>
          <label className="form-label">Full Name</label>
          <input className="form-input" placeholder="e.g. Juan Dela Cruz"
            value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />

          <label className="form-label" style={{ marginTop: 12 }}>Phone</label>
          <input className="form-input" placeholder="0917 123 4567"
            value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />

          <label className="form-label" style={{ marginTop: 12 }}>Email</label>
          <input className="form-input" type="email" placeholder="name@example.com"
            value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={handleSave}>Save</button>
            <button className="btn-ghost"   style={{ flex: 1 }} onClick={() => setModal(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CustomersPage;