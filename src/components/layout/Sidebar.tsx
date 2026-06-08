import React, { useState, useEffect } from 'react';
import logoImage from '../../assets/Logo-pg.png';
import { NAV_ITEMS } from '../../data/seed';
import { useAuth } from '../../auth/AuthContext';
import { useRole } from '../../auth/useRole';
import { Permission, Tenant } from '../../types';
import LoadingScreen from '../shared/LoadingScreen';
import { getUserTenants } from '../../services/db';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const PAGE_PERMISSION: Partial<Record<string, keyof Permission>> = {
  expenses:     'canViewExpenses',
  reports:      'canViewReports',
  distribution: 'canViewDistribution',
  users:        'canViewUsers',
  settings:     'canViewSettings',
};

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  Admin:   { bg: '#fee2e2', color: '#dc2626' },
  Manager: { bg: '#ede9fe', color: '#6d28d9' },
  Cashier: { bg: '#dbeafe', color: '#1d4ed8' },
  Staff:   { bg: '#fef3c7', color: '#b45309' },
};

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const { user, logout, switchTenant, currentTenantId, activeUser, createTenant } = useAuth();
  const { role, can } = useRole();

  const [showLogout,     setShowLogout]     = useState(false);
  const [signingOut,     setSigningOut]     = useState(false);
  const [tenants,        setTenants]        = useState<Tenant[]>([]);
  const [showTenants,    setShowTenants]    = useState(false);
  const [addingBusiness, setAddingBusiness] = useState(false);
  const [newBizName,     setNewBizName]     = useState('');
  const [bizError,       setBizError]       = useState('');
  const [bizLoading,     setBizLoading]     = useState(false);

  const rb = ROLE_BADGE[role] ?? ROLE_BADGE.Staff;
  const isAdmin = role === 'Admin';

  // Load tenants for admin users
  useEffect(() => {
    if (!isAdmin) return;
    getUserTenants()
      .then(setTenants)
      .catch(console.error);
  }, [isAdmin, currentTenantId]);

  const currentTenant = tenants.find(t => t.id === currentTenantId);

  const visibleItems = NAV_ITEMS.filter((item) => {
    const perm = PAGE_PERMISSION[item.id];
    return perm ? can(perm) : true;
  });

  const handleLogout = async () => {
    setShowLogout(false);
    setSigningOut(true);
    await logout();
  };

  const handleSwitchTenant = (tenantId: string) => {
    switchTenant(tenantId);
    setShowTenants(false);
    // Reload page to refresh all data for new tenant
    window.location.reload();
  };

  const handleAddBusiness = async () => {
    setBizError('');
    if (!newBizName.trim()) return setBizError('Business name is required.');
    setBizLoading(true);
    const result = await createTenant(newBizName.trim());
    setBizLoading(false);
    if (!result.success) return setBizError(result.error ?? 'Failed to create business.');
    setNewBizName('');
    setAddingBusiness(false);
    // Reload tenants
    getUserTenants().then(setTenants).catch(console.error);
    // Switch to new tenant
    if (result.tenantId) handleSwitchTenant(result.tenantId);
  };

  return (
    <>
      {signingOut && <LoadingScreen message="Signing out..." />}

      <aside className="sidebar">
        <div className="sb-logo">
          <div className="sb-logo-icon" style={{ background: 'transparent', padding: 0, overflow: 'hidden' }}>
            <img src={logoImage} alt="Sales Flow Logo"
              style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8 }} />
          </div>
          <div>
            <div className="sb-logo-name">Sales Flow</div>
            <div className="sb-logo-sub">Sales Tracker</div>
          </div>
        </div>

        {/* ── Business switcher (admin only) ── */}
        {isAdmin && (
          <div style={{ padding: '0 12px', marginBottom: 8, position: 'relative' }}>
            <button
              onClick={() => { setShowTenants(v => !v); setAddingBusiness(false); }}
              style={styles.bizBtn}
            >
              <i className="ti ti-building-store" style={{ fontSize: 14, flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentTenant?.businessName ?? 'Select Business'}
              </span>
              <i className={`ti ti-chevron-${showTenants ? 'up' : 'down'}`} style={{ fontSize: 12, flexShrink: 0 }} />
            </button>

            {showTenants && (
              <div style={styles.tenantDropdown}>
                {tenants.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSwitchTenant(t.id)}
                    style={{
                      ...styles.tenantItem,
                      background: t.id === currentTenantId ? 'rgba(79,70,229,0.15)' : 'none',
                      color: t.id === currentTenantId ? '#818cf8' : 'rgba(255,255,255,0.8)',
                    }}
                  >
                    <i className="ti ti-building" style={{ fontSize: 13 }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>{t.businessName}</span>
                    {t.id === currentTenantId && (
                      <i className="ti ti-check" style={{ fontSize: 12, color: '#818cf8' }} />
                    )}
                  </button>
                ))}

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />

                {!addingBusiness ? (
                  <button
                    onClick={() => setAddingBusiness(true)}
                    style={{ ...styles.tenantItem, color: '#818cf8' }}
                  >
                    <i className="ti ti-plus" style={{ fontSize: 13 }} />
                    <span>Add New Business</span>
                  </button>
                ) : (
                  <div style={{ padding: '6px 4px' }}>
                    <input
                      autoFocus
                      placeholder="Business name..."
                      value={newBizName}
                      onChange={e => setNewBizName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddBusiness()}
                      style={styles.bizInput}
                    />
                    {bizError && (
                      <div style={{ color: '#e74c3c', fontSize: 11, marginTop: 4 }}>{bizError}</div>
                    )}
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <button
                        onClick={handleAddBusiness}
                        disabled={bizLoading}
                        style={styles.bizConfirmBtn}
                      >
                        {bizLoading ? '...' : 'Create'}
                      </button>
                      <button
                        onClick={() => { setAddingBusiness(false); setBizError(''); setNewBizName(''); }}
                        style={styles.bizCancelBtn}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <nav className="nav" aria-label="Main navigation">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className={`nav-item${activePage === item.id ? ' active' : ''}`}
              onClick={() => onNavigate(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onNavigate(item.id)}
            >
              <i className={`ti ${item.icon}`} aria-hidden="true" />
              {item.label}
            </div>
          ))}
        </nav>

        {/* User section */}
        <div style={{ position: 'relative' }}>
          {showLogout && (
            <div style={styles.popover}>
              <button style={styles.logoutBtn} onClick={handleLogout}>
                <i className="ti ti-logout" style={{ fontSize: 15 }} />
                Sign Out
              </button>
            </div>
          )}

          <div
            className="sb-user"
            onClick={() => setShowLogout(v => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setShowLogout(v => !v)}
            style={{ cursor: 'pointer' }}
            title="Account options"
          >
            <div className="sb-avatar">{user?.initials ?? '??'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sb-uname">{user?.name ?? '—'}</div>
              <span style={{
                display: 'inline-block', fontSize: 10, fontWeight: 700,
                padding: '1px 7px', borderRadius: 4,
                background: rb.bg, color: rb.color, marginTop: 2,
              }}>
                {role}
              </span>
            </div>
            <i className="ti ti-chevron-down" style={{
              color: 'rgba(255,255,255,0.3)', fontSize: 14,
              transition: 'transform 0.2s',
              transform: showLogout ? 'rotate(180deg)' : 'rotate(0deg)',
            }} />
          </div>
        </div>
      </aside>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  bizBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', padding: '8px 10px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, color: 'rgba(255,255,255,0.7)',
    fontSize: 12, fontWeight: 500, cursor: 'pointer',
    fontFamily: 'inherit',
  },
  tenantDropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    marginTop: 4, background: '#1a1f35',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: 4, zIndex: 100,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  },
  tenantItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', padding: '8px 10px',
    background: 'none', border: 'none',
    borderRadius: 6, color: 'rgba(255,255,255,0.8)',
    fontSize: 12, fontWeight: 500, cursor: 'pointer',
    fontFamily: 'inherit',
  },
  bizInput: {
    width: '100%', padding: '7px 10px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6, color: '#fff', fontSize: 12,
    fontFamily: 'inherit', boxSizing: 'border-box' as const,
  },
  bizConfirmBtn: {
    flex: 1, padding: '6px', background: '#4f46e5',
    border: 'none', borderRadius: 6, color: '#fff',
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit',
  },
  bizCancelBtn: {
    flex: 1, padding: '6px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6, color: 'rgba(255,255,255,0.6)',
    fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
  },
  popover: {
    position: 'absolute', bottom: '100%', left: 12, right: 12,
    marginBottom: 6, background: '#1a1f35',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: 6, zIndex: 50,
  },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', padding: '9px 12px',
    background: 'rgba(231,76,60,0.08)',
    border: '1px solid rgba(231,76,60,0.2)',
    borderRadius: 8, color: '#e74c3c',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
    fontFamily: 'inherit',
  },
};

export default Sidebar;