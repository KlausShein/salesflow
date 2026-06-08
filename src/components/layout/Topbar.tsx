import React, { useRef } from 'react';

interface TopbarProps {
  pageTitle:     string;
  dateLabel:     string;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
}

const Topbar: React.FC<TopbarProps> = ({
  pageTitle,
  dateLabel,
  selectedDate,
  onDateChange,
}) => {
  const dateRef = useRef<HTMLInputElement>(null);

  return (
    <header className="topbar">
      <div className="topbar-title">{pageTitle}</div>

      <div className="topbar-right">

        {/* ── Clickable date picker ── */}
        <div
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => dateRef.current?.showPicker()}
          title="Change date"
        >
          <div className="tb-date">
            <i className="ti ti-calendar" style={{ fontSize: 15 }} aria-hidden="true" />
            <span>{dateLabel}</span>
            <i className="ti ti-chevron-down" style={{ fontSize: 13 }} aria-hidden="true" />
          </div>

          <input
            ref={dateRef}
            type="date"
            value={selectedDate ?? ''}
            onChange={(e) => onDateChange?.(e.target.value)}
            style={{
              position: 'absolute', opacity: 0,
              width: '100%', height: '100%',
              top: 0, left: 0, pointerEvents: 'none',
            }}
            aria-label="Select date"
          />
        </div>

        <div className="tb-icon notif-dot" role="button" aria-label="Notifications">
          <i className="ti ti-bell" aria-hidden="true" />
        </div>
        <div className="tb-icon" role="button" aria-label="Theme">
          <i className="ti ti-moon" aria-hidden="true" />
        </div>
      </div>
    </header>
  );
};

export default Topbar;