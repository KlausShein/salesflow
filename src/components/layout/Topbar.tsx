import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SalesRecord, ExpenseRecord } from '../../types';

interface Notification {
  id:      string;
  icon:    string;
  color:   string;
  bg:      string;
  message: string;
  time:    string;
  unread:  boolean;
}

interface TopbarProps {
  pageTitle:    string;
  dateLabel:    string;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  sales:        SalesRecord[];
  expenses:     ExpenseRecord[];
}

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const Topbar: React.FC<TopbarProps> = ({
  pageTitle, dateLabel, selectedDate, onDateChange, sales, expenses,
}) => {
  const today = new Date();
  const [calOpen,   setCalOpen]   = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [curMonth,  setCurMonth]  = useState(() => {
    const d = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const calRef   = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // ── Build notifications from live data ──────────────────────
  useEffect(() => {
    const todayIso = today.toISOString().split('T')[0];
    const firstOfMonth = todayIso.slice(0, 7) + '-01';
    const notifs: Notification[] = [];

    // No sales today
    const hasSalesToday = sales.some(s => s.date === todayIso);
    if (!hasSalesToday) {
      notifs.push({
        id: 'no-sales',
        icon: 'ti-alert-circle',
        color: '#f87171',
        bg: 'rgba(239,68,68,0.15)',
        message: 'No sales entered today. Remember to log your daily sales.',
        time: 'Today',
        unread: true,
      });
    }

    // Expenses added today
    const todayExpenses = expenses.filter(e => e.date === todayIso);
    if (todayExpenses.length > 0) {
      const total = todayExpenses.reduce((s, e) => s + e.amount, 0);
      notifs.push({
        id: 'expenses-today',
        icon: 'ti-receipt-2',
        color: '#fbbf24',
        bg: 'rgba(245,158,11,0.15)',
        message: `${todayExpenses.length} expense${todayExpenses.length > 1 ? 's' : ''} added today totalling ₱${total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`,
        time: 'Today',
        unread: true,
      });
    }

    // Monthly summary
    const monthSales    = sales.filter(s => s.date >= firstOfMonth).reduce((t, s) => t + s.amount, 0);
    const monthExpenses = expenses.filter(e => e.date >= firstOfMonth).reduce((t, e) => t + e.amount, 0);
    if (monthSales > 0) {
      notifs.push({
        id: 'monthly-summary',
        icon: 'ti-chart-bar',
        color: '#34d399',
        bg: 'rgba(16,185,129,0.15)',
        message: `${MONTHS[today.getMonth()]} so far: ₱${monthSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })} in sales, ₱${monthExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })} in expenses.`,
        time: 'This month',
        unread: false,
      });
    }

    // App update (from electron auto-updater)
    const updateVersion = (window as any).__pendingUpdateVersion;
    if (updateVersion) {
      notifs.push({
        id: 'app-update',
        icon: 'ti-rocket',
        color: '#818cf8',
        bg: 'rgba(99,102,241,0.15)',
        message: `Update v${updateVersion} is ready. Restart the app to apply.`,
        time: 'Now',
        unread: true,
      });
    }

    setNotifications(notifs);
  }, [sales, expenses]);

  // ── Close panels on outside click ───────────────────────────
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (calRef.current   && !calRef.current.contains(e.target as Node))   setCalOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  }, []);

  const unreadCount = notifications.filter(n => n.unread).length;

  // ── Calendar helpers ─────────────────────────────────────────
  const selDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : today;
  const firstDay = new Date(curMonth.getFullYear(), curMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(curMonth.getFullYear(), curMonth.getMonth() + 1, 0).getDate();
  const prevMonthDays = new Date(curMonth.getFullYear(), curMonth.getMonth(), 0).getDate();

  const handleDayClick = (day: number) => {
    const mm = String(curMonth.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onDateChange?.(`${curMonth.getFullYear()}-${mm}-${dd}`);
    setCalOpen(false);
  };

  return (
    <header className="topbar" style={{ position: 'relative' }}>
      <div className="topbar-title">{pageTitle}</div>

      <div className="topbar-right" style={{ position: 'relative' }}>

        {/* ── Date picker ── */}
        <div ref={calRef} style={{ position: 'relative' }}>
          <div
            className="tb-date"
            onClick={() => { setCalOpen(o => !o); setNotifOpen(false); }}
            role="button"
            aria-label="Change date"
            aria-expanded={calOpen}
          >
            <i className="ti ti-calendar" style={{ fontSize: 15 }} aria-hidden="true" />
            <span>{dateLabel}</span>
            <i className="ti ti-chevron-down" style={{ fontSize: 12, transition: 'transform 0.2s', transform: calOpen ? 'rotate(180deg)' : 'none' }} aria-hidden="true" />
          </div>

          {calOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 280, background: '#1e2235',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              zIndex: 9999, overflow: 'hidden',
            }}>
              {/* Month nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => setCurMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-chevron-left" />
                </button>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
                  {MONTHS[curMonth.getMonth()]} {curMonth.getFullYear()}
                </div>
                <button onClick={() => setCurMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-chevron-right" />
                </button>
              </div>

              {/* Day labels */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '10px 12px 4px', gap: 2 }}>
                {DAY_LABELS.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#475569', fontWeight: 600, padding: '4px 0' }}>{d}</div>
                ))}
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '0 12px 14px', gap: 2 }}>
                {Array.from({ length: firstDay }, (_, i) => (
                  <button key={`prev-${i}`} disabled style={{ textAlign: 'center', padding: '6px 2px', fontSize: 13, color: '#2d3748', background: 'none', border: 'none', borderRadius: 8 }}>
                    {prevMonthDays - firstDay + i + 1}
                  </button>
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const isToday = day === today.getDate() && curMonth.getMonth() === today.getMonth() && curMonth.getFullYear() === today.getFullYear();
                  const isSel = day === selDate.getDate() && curMonth.getMonth() === selDate.getMonth() && curMonth.getFullYear() === selDate.getFullYear();
                  return (
                    <button
                      key={day}
                      onClick={() => handleDayClick(day)}
                      style={{
                        textAlign: 'center', padding: '6px 2px', fontSize: 13,
                        borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: isSel ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'none',
                        color: isSel ? '#fff' : isToday ? '#818cf8' : '#94a3b8',
                        fontWeight: isSel || isToday ? 700 : 400,
                        transition: 'all 0.12s',
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Today shortcut */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 16px' }}>
                <button onClick={() => { onDateChange?.(today.toISOString().split('T')[0]); setCurMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setCalOpen(false); }}
                  style={{ width: '100%', padding: '7px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, color: '#818cf8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Go to Today
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Notification bell ── */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <div
            className="tb-icon"
            onClick={() => { setNotifOpen(o => !o); setCalOpen(false); }}
            role="button"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            style={{ position: 'relative' }}
          >
            <i className="ti ti-bell" aria-hidden="true" />
            {unreadCount > 0 && (
              <div style={{
                position: 'absolute', top: -4, right: -4,
                width: 16, height: 16, background: '#ef4444',
                borderRadius: '50%', fontSize: 10, fontWeight: 700,
                color: '#fff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', border: '2px solid var(--bg, #1a1d2e)',
              }}>
                {unreadCount}
              </div>
            )}
          </div>

          {notifOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 320, background: '#1e2235',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              zIndex: 9999, overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Notifications</div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} style={{ fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
                  <i className="ti ti-bell-off" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
                  No notifications
                </div>
              ) : (
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '12px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: n.unread ? 'rgba(99,102,241,0.05)' : 'transparent',
                        cursor: 'pointer', transition: 'background 0.12s',
                      }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: n.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                        <i className={`ti ${n.icon}`} style={{ color: n.color }} aria-hidden="true" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.4 }}>{n.message}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>{n.time}</div>
                      </div>
                      {n.unread && (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', marginTop: 6, flexShrink: 0 }} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Theme toggle ── */}
        <div className="tb-icon" role="button" aria-label="Theme">
          <i className="ti ti-moon" aria-hidden="true" />
        </div>
      </div>
    </header>
  );
};

export default Topbar;