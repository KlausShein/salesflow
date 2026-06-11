import React from 'react';

interface QuickActionDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

const QUICK_ACTIONS: QuickActionDef[] = [
  { id: 'new-sale',     label: 'New Sale',     icon: 'ti-shopping-cart',  color: '#2563eb', bgColor: '#dbeafe' },
  { id: 'add-expense',  label: 'Add Expense',  icon: 'ti-receipt-2',      color: '#ef4444', bgColor: '#fee2e2' },
  { id: 'reports',      label: 'Reports',      icon: 'ti-chart-bar',      color: '#8b5cf6', bgColor: '#ede9fe' },
  { id: 'services',     label: 'Services',     icon: 'ti-printer',        color: '#10b981', bgColor: '#dcfce7' },
  { id: 'distribution', label: 'Distribution', icon: 'ti-arrows-split-2', color: '#f59e0b', bgColor: '#fef3c7' },
  { id: 'settings',     label: 'Settings',     icon: 'ti-settings-2',     color: '#64748b', bgColor: '#f1f5f9' },
];

interface QuickActionsProps {
  onAction?: (actionId: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onAction }) => (
  <div className="qa-card">
    <div className="qa-title">⚡ Quick Actions</div>
    <div className="qa-grid">
      {QUICK_ACTIONS.map(qa => (
        <div
          key={qa.id}
          className="qa-btn"
          role="button"
          tabIndex={0}
          onClick={() => onAction?.(qa.id)}
          onKeyDown={e => e.key === 'Enter' && onAction?.(qa.id)}
        >
          <div className="qa-icon" style={{ background: qa.bgColor }}>
            <i className={`ti ${qa.icon}`} style={{ color: qa.color, fontSize: 15 }} aria-hidden="true" />
          </div>
          <span className="qa-label">{qa.label}</span>
          <i className="ti ti-chevron-right" style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }} aria-hidden="true" />
        </div>
      ))}
    </div>
  </div>
);

export default QuickActions;
