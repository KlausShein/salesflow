import React from 'react';

interface AccessDeniedProps {
  pageName?: string;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ pageName }) => (
  <div style={{
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 40,
  }}>
    <div style={{
      width: 64, height: 64, borderRadius: '50%',
      background: '#fee2e2',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <i className="ti ti-lock" style={{ fontSize: 28, color: '#dc2626' }} aria-hidden="true" />
    </div>
    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
      Access Denied
    </div>
    <div style={{
      fontSize: 13, color: 'var(--muted)',
      textAlign: 'center', maxWidth: 340,
    }}>
      You don't have permission to view
      {pageName ? ` the ${pageName} page` : ' this page'}.
      Contact your administrator to request access.
    </div>
  </div>
);

export default AccessDenied;