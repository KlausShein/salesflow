import React, { useState } from 'react';
import logoImage from '../../assets/Logo-pg.png';
import { NAV_ITEMS } from '../../data/seed';
import { useAuth } from '../../auth/AuthContext';
import { useRole } from '../../auth/useRole';
import { Permission } from '../../types';
import LoadingScreen from '../shared/LoadingScreen';

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
  const { user, logout } = useAuth();
  const { role, can }    = useRole();
  const [showLogout,    setShowLogout]    = useState(false);
  const [signingOut,    setSigningOut]    = useState(false);  // ← new

  const rb = ROLE_BADGE[role] ?? ROLE_BADGE.Staff;

  const visibleItems = NAV_ITEMS.filter((item) => {
    const perm = PAGE_PERMISSION[item.id];
    return perm ? can(perm) : true;
  });

  // ── Handle sign out with loading animation ───────────────
  const handleLogout = async () => {
    setShowLogout(false);
    setSigningOut(true);
    await logout();
    // No need to setSigningOut(false) — page redirects to login
  };

  return (
    <>
      {/* ── Sign out loading overlay ── */}
      {signingOut && <LoadingScreen message="Signing out..." />}

      <aside className="sidebar">
        <div className="sb-logo">
          <div className="sb-logo-icon" style={{ background: 'transparent', padding: 0, overflow: 'hidden' }}>
            <img
              src={logoImage}
              alt="Sales Flow Logo"
              style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8 }}
            />
          </div>
          <div>
            <div className="sb-logo-name">Sales Flow</div>
            <div className="sb-logo-sub">Sales Tracker</div>
          </div>
        </div>

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

        {/* User section with logout popover */}
        <div style={{ position: 'relative' }}>
          {showLogout && (
            <div style={styles.popover}>
              <button style={styles.logoutBtn} onClick={handleLogout}>
                <i className="ti ti-logout" aria-hidden="true" style={{ fontSize: 15 }} />
                Sign Out
              </button>
            </div>
          )}

          <div
            className="sb-user"
            onClick={() => setShowLogout((v) => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setShowLogout((v) => !v)}
            style={{ cursor: 'pointer' }}
            title="Account options"
          >
            <div className="sb-avatar">{user?.initials ?? '??'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sb-uname">{user?.name ?? '—'}</div>
              <span style={{
                display: 'inline-block',
                fontSize: 10, fontWeight: 700,
                padding: '1px 7px', borderRadius: 4,
                background: rb.bg, color: rb.color,
                marginTop: 2,
              }}>
                {role}
              </span>
            </div>
            <i
              className="ti ti-chevron-down"
              style={{
                color: 'rgba(255,255,255,0.3)',
                fontSize: 14,
                transition: 'transform 0.2s',
                transform: showLogout ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
              aria-hidden="true"
            />
          </div>
        </div>
      </aside>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  popover: {
    position: 'absolute',
    bottom: '100%',
    left: 12,
    right: 12,
    marginBottom: 6,
    background: '#1a1f35',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 6,
    zIndex: 50,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '9px 12px',
    background: 'rgba(231,76,60,0.08)',
    border: '1px solid rgba(231,76,60,0.2)',
    borderRadius: 8,
    color: '#e74c3c',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};

export default Sidebar;