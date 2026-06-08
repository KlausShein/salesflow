import React from 'react';
import { WorkingDaysConfig } from '../../types';
import { calculateWorkingDaysPerMonth } from '../../utils/financialCalculations';

interface WorkingDaysConfigProps {
  config: WorkingDaysConfig;
  onSave: (config: WorkingDaysConfig) => Promise<void>;
  saving: boolean;
  canEdit: boolean;
}

const WorkingDaysConfigComponent: React.FC<WorkingDaysConfigProps> = ({
  config,
  onSave,
  saving,
  canEdit,
}) => {
  const [draft, setDraft] = React.useState<WorkingDaysConfig>(config);
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => {
    setDraft(config);
  }, [config]);

  const days = [
    { key: 'monday' as const, label: 'Mon' },
    { key: 'tuesday' as const, label: 'Tue' },
    { key: 'wednesday' as const, label: 'Wed' },
    { key: 'thursday' as const, label: 'Thu' },
    { key: 'friday' as const, label: 'Fri' },
    { key: 'saturday' as const, label: 'Sat' },
    { key: 'sunday' as const, label: 'Sun' },
  ];

  const activeDays = days.filter(d => draft[d.key]).length;
  const autoCalculatedDays = calculateWorkingDaysPerMonth(draft);

  const handleDayToggle = (key: keyof Omit<WorkingDaysConfig, 'id' | 'workingDaysPerMonth'>) => {
    const updated = { ...draft, [key]: !draft[key] };
    updated.workingDaysPerMonth = calculateWorkingDaysPerMonth(updated);
    setDraft(updated);
  };

  const handleSave = async () => {
    await onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(config);
    setEditing(false);
  };

  return (
    <div className="page-card" style={{ padding: '14px 16px' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Working Days Configuration</div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>Select operating days</div>
        </div>
        {canEdit && !editing && (
          <button
            className="btn-primary"
            onClick={() => setEditing(true)}
            style={{ fontSize: 11, padding: '5px 10px' }}
          >
            <i className="ti ti-edit" aria-hidden="true" /> Edit
          </button>
        )}
      </div>

      {/* Day Buttons - Ultra Compact */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
        {days.map(day => (
          <button
            key={day.key}
            onClick={() => editing && handleDayToggle(day.key)}
            disabled={!editing}
            style={{
              padding: '4px 2px',
              borderRadius: 3,
              border: `1px solid ${draft[day.key] ? 'var(--accent)' : '#e5e7eb'}`,
              background: draft[day.key] ? 'rgba(79, 70, 229, 0.06)' : 'transparent',
              color: draft[day.key] ? 'var(--accent)' : '#9ca3af',
              fontWeight: draft[day.key] ? 600 : 500,
              cursor: editing ? 'pointer' : 'default',
              fontSize: 10,
              transition: 'all 0.1s',
            }}
          >
            {day.label}
          </button>
        ))}
      </div>

      {/* Working Days Input - Inline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
          Working Days:
        </span>
        <input
          type="number"
          value={draft.workingDaysPerMonth}
          onChange={e => {
            const val = parseInt(e.target.value) || 20;
            setDraft(prev => ({ ...prev, workingDaysPerMonth: Math.max(1, val) }));
          }}
          disabled={!editing}
          style={{
            width: 45,
            border: '1px solid #d1d5db',
            borderRadius: 3,
            padding: '3px 5px',
            fontSize: 11,
            fontWeight: 600,
            background: 'white',
            outline: 'none',
            cursor: editing ? 'text' : 'default',
          }}
        />
        <span style={{ fontSize: 10, color: '#6b7280' }}>days/month</span>
      </div>

      {/* Info Box - Minimal */}
      <div style={{
        padding: '6px 8px',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 4,
        fontSize: 10,
        color: '#0c4a6e',
        marginBottom: editing ? 8 : 0,
      }}>
        {activeDays} day{activeDays !== 1 ? 's' : ''}/week × 4.33 = {autoCalculatedDays} days/month
      </div>

      {/* Save/Cancel - Minimal */}
      {editing && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 1, fontSize: 11, padding: '5px 8px' }}
          >
            <i className={`ti ${saving ? 'ti-loader-2' : 'ti-check'}`} style={{ fontSize: 12 }} aria-hidden="true" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            className="btn-ghost"
            onClick={handleCancel}
            style={{ flex: 1, fontSize: 11, padding: '5px 8px' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkingDaysConfigComponent;