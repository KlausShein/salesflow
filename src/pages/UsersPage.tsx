import React, { useState, useMemo } from 'react';
import { SystemUser, SystemUserRole } from '../types';
import Pagination from '../components/shared/Pagination';
import Modal from '../components/shared/Modal';
import ActionBtns from '../components/shared/ActionBtns';

interface UsersPageProps {
  users:          SystemUser[];
  onAdd:          (u: Omit<SystemUser, 'id'>) => void;
  onToggleStatus: (id: string) => void;
  canManage:      boolean;
}

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  'Admin':         { bg: '#fee2e2', color: '#dc2626' },
  'Manager':       { bg: '#ede9fe', color: '#6d28d9' },
  'Cashier':       { bg: '#dbeafe', color: '#1d4ed8' },
  'Store Manager': { bg: '#ede9fe', color: '#6d28d9' },
  'Staff':         { bg: '#fef3c7', color: '#b45309' },
};

const ROLES: SystemUserRole[] = ['Admin', 'Manager', 'Cashier', 'Staff'];
const PER = 10;

const defaultForm = {
  name:     '',
  role:     'Cashier' as SystemUserRole,
  email:    '',
  username: '',
  password: '',
};

const UsersPage: React.FC<UsersPageProps> = ({
  users, onAdd, onToggleStatus, canManage,
}) => {
  const [search,    setSearch]    = useState('');
  const [page,      setPage]      = useState(1);
  const [modal,     setModal]     = useState(false);
  const [form,      setForm]      = useState(defaultForm);
  const [showPass,  setShowPass]  = useState(false);
  const [formError, setFormError] = useState('');

  const filtered = useMemo(() =>
    users.filter((u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    ), [users, search]);

  const totalPages = Math.ceil(filtered.length / PER);
  const rows       = filtered.slice((page - 1) * PER, page * PER);

  const save = () => {
    setFormError('');
    if (!form.name)     return setFormError('Full name is required.');
    if (!form.username) return setFormError('Username is required.');
    if (!form.email)    return setFormError('Email is required.');
    if (!form.password) return setFormError('Password is required.');
    if (form.password.length < 6) return setFormError('Password must be at least 6 characters.');

    const initials = form.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

    onAdd({
      name:     form.name,
      role:     form.role,
      email:    form.email,
      username: form.username.trim().toLowerCase(),
      password: form.password,
      initials,
      status:   'Active',
    });

    setForm(defaultForm);
    setModal(false);
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-sub">Manage system users and their access</p>
        </div>
        {/* Only Admin can add users */}
        {canManage && (
          <button className="btn-primary" onClick={() => { setModal(true); setFormError(''); }}>
            <i className="ti ti-plus" aria-hidden="true" /> Add User
          </button>
        )}
      </div>

      <div className="page-card" style={{ marginBottom: 14 }}>
        <div style={{ position: 'relative', maxWidth: 380 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 15 }} aria-hidden="true" />
          <input className="search-input" placeholder="Search users..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="page-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th><th>Name</th><th>Username</th>
              <th>Role</th><th>Email</th><th>Status</th>
              {canManage && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((u, i) => {
              const rs = ROLE_STYLE[u.role] ?? { bg: '#f1f5f9', color: '#64748b' };
              return (
                <tr key={u.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{(page - 1) * PER + i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>
                        {u.initials}
                      </div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--muted)', fontFamily: 'monospace', fontSize: 13 }}>
                    @{u.username ?? '—'}
                  </td>
                  <td>
                    <span className="cat-badge" style={{ background: rs.bg, color: rs.color }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ color: 'var(--accent)' }}>{u.email}</td>
                  <td>
                    <span
                      className="status-badge"
                      style={{
                        background: u.status === 'Active' ? '#dcfce7' : '#fee2e2',
                        color:      u.status === 'Active' ? '#15803d' : '#dc2626',
                        // Only Admin can toggle status
                        cursor: canManage ? 'pointer' : 'default',
                      }}
                      onClick={() => canManage && onToggleStatus(u.id)}
                    >
                      {u.status}
                    </span>
                  </td>
                  {canManage && (
                    <td><ActionBtns onEdit={() => {}} onDelete={() => {}} /></td>
                  )}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={canManage ? 7 : 6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0' }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} total={filtered.length} perPage={PER} onPage={setPage} />
      </div>

      {modal && canManage && (
        <Modal title="Add User" onClose={() => setModal(false)}>
          <label className="form-label">Full Name</label>
          <input className="form-input" placeholder="e.g. John Doe"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />

          <label className="form-label" style={{ marginTop: 12 }}>Username</label>
          <input className="form-input" placeholder="e.g. johndoe"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
          <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4 }}>
            Staff will use this to log in.
          </p>

          <label className="form-label" style={{ marginTop: 12 }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              className="form-input"
              type={showPass ? 'text' : 'password'}
              placeholder="Min. 6 characters"
              value={form.password}
              style={{ paddingRight: 40 }}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer', color: 'var(--muted)',
              }}
            >
              <i className={`ti ${showPass ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
            </button>
          </div>

          <label className="form-label" style={{ marginTop: 12 }}>Role</label>
          <select className="form-input" value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as SystemUserRole }))}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>

          <label className="form-label" style={{ marginTop: 12 }}>Email Address</label>
          <input className="form-input" type="email" placeholder="name@example.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />

          {formError && (
            <div style={{
              marginTop: 12, padding: '8px 12px',
              background: 'rgba(231,76,60,0.1)',
              border: '1px solid rgba(231,76,60,0.3)',
              borderRadius: 8, color: '#e74c3c', fontSize: 13,
            }}>
              {formError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={save}>Save User</button>
            <button className="btn-ghost"   style={{ flex: 1 }} onClick={() => setModal(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UsersPage;