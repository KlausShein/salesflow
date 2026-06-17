import React, { useState, useEffect, useRef } from 'react';

interface DatePickerProps {
  value:    string;
  onChange: (date: string) => void;
  disabled?: boolean;
}

const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, disabled }) => {
  const today   = new Date();
  const selDate = value ? new Date(value + 'T00:00:00') : today;

  const [open,     setOpen]     = useState(false);
  const [curMonth, setCurMonth] = useState(new Date(selDate.getFullYear(), selDate.getMonth(), 1));
  const ref = useRef<HTMLDivElement>(null);

  // Sync curMonth when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      setCurMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const firstDay      = new Date(curMonth.getFullYear(), curMonth.getMonth(), 1).getDay();
  const daysInMonth   = new Date(curMonth.getFullYear(), curMonth.getMonth() + 1, 0).getDate();
  const prevMonthDays = new Date(curMonth.getFullYear(), curMonth.getMonth(), 0).getDate();

  const handleDayClick = (day: number) => {
    const mm = String(curMonth.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${curMonth.getFullYear()}-${mm}-${dd}`);
    setOpen(false);
  };

  const displayDate = selDate.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '10px 14px',
          background: 'rgba(255,255,255,0.6)',
          border: '1.5px solid rgba(255,255,255,0.35)',
          borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 13, color: 'var(--text)', fontFamily: 'inherit',
          transition: 'border-color 0.15s',
        }}
      >
        <i className="ti ti-calendar" style={{ fontSize: 15, color: '#9ca3af' }} aria-hidden="true" />
        <span style={{ flex: 1, textAlign: 'left' }}>{displayDate}</span>
        <i className="ti ti-chevron-down" style={{
          fontSize: 12, color: '#9ca3af',
          transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'none',
        }} aria-hidden="true" />
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          width: 280, background: '#1e2235',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          zIndex: 9999, overflow: 'hidden',
        }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setCurMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            ><i className="ti ti-chevron-left" /></button>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
              {MONTHS[curMonth.getMonth()]} {curMonth.getFullYear()}
            </div>
            <button
              onClick={() => setCurMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            ><i className="ti ti-chevron-right" /></button>
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
              <button key={`prev-${i}`} disabled style={{ textAlign: 'center', padding: '6px 2px', fontSize: 13, color: '#2d3748', background: 'none', border: 'none', borderRadius: 8, cursor: 'default' }}>
                {prevMonthDays - firstDay + i + 1}
              </button>
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day    = i + 1;
              const isToday = day === today.getDate() && curMonth.getMonth() === today.getMonth() && curMonth.getFullYear() === today.getFullYear();
              const isSel   = day === selDate.getDate() && curMonth.getMonth() === selDate.getMonth() && curMonth.getFullYear() === selDate.getFullYear();
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
            <button
              onClick={() => {
                onChange(today.toISOString().split('T')[0]);
                setCurMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                setOpen(false);
              }}
              style={{ width: '100%', padding: '7px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, color: '#818cf8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Go to Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;