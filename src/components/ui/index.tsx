import React from 'react';
import { formatPeso } from '../../utils/helpers';

// ── StatCard ──────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  accentGradient: string;
  iconBg: string;
  iconColor: string;
  change: number;
  isCurrency?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label, value, icon, accentGradient, iconBg, iconColor, change, isCurrency = true,
}) => (
  <article className="stat-card">
    <div className="stat-card-accent" style={{ background: accentGradient }} />
    <div className="stat-icon" style={{ background: iconBg, color: iconColor }}>
      <i className={`ti ${icon}`} aria-hidden="true" />
    </div>
    <div className="stat-label">{label}</div>
    <div className="stat-value">
      {isCurrency ? formatPeso(typeof value === 'number' ? value : 0) : value}
    </div>
    <span className={`stat-badge ${change >= 0 ? 'badge-up' : 'badge-down'}`}>
      <i className={`ti ${change >= 0 ? 'ti-trending-up' : 'ti-trending-down'}`} style={{ fontSize: 10 }} aria-hidden="true" />
      {change >= 0 ? '+' : ''}{change}%
    </span>
  </article>
);

// ── Card wrapper ──────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', style }) => (
  <div className={`card ${className}`} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, ...style }}>
    {children}
  </div>
);

// ── CardHeader ────────────────────────────────────────────
interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action }) => (
  <div className="card-header">
    <div>
      <div className="card-title">{title}</div>
      {subtitle && <div className="card-sub">{subtitle}</div>}
    </div>
    {action}
  </div>
);

// ── Badge ─────────────────────────────────────────────────
interface BadgeProps {
  label: string;
  variant: 'sale' | 'expense';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant }) => (
  <span className={`type-badge badge-${variant}`}>{label}</span>
);

// ── ProgressBar ───────────────────────────────────────────
interface ProgressBarProps {
  value: number; // 0–100
  color: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, color }) => (
  <div className="prog-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
    <div className="prog-fill" style={{ width: `${value}%`, background: color }} />
  </div>
);
