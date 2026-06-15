import React, { useState, useMemo } from 'react';
import { DistributionCategory, SalesRecord, FinancialProjection, WorkingDaysConfig } from '../types';
import { formatPeso, computeDistribution } from '../utils/helpers';
import { calculateFinancialProjections, getBreakEvenStatus } from '../utils/financialCalculations';

interface DistributionPageProps {
  categories: DistributionCategory[];
  salesRecords: SalesRecord[];
  workingDays: WorkingDaysConfig;
  onSave: (cats: DistributionCategory[]) => Promise<void>;
  onSaveWorkingDays: (config: WorkingDaysConfig) => Promise<void>;
  canEdit: boolean;
  saving: boolean;
}

const COLORS = [
  '#4f46e5', '#3b82f6', '#f59e0b', '#06b6d4',
  '#10b981', '#ec4899', '#f97316', '#8b5cf6',
  '#dc2626', '#0891b2',
];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DistributionPage: React.FC<DistributionPageProps> = ({
  categories,
  salesRecords,
  workingDays,
  onSave,
  onSaveWorkingDays,
  canEdit,
  saving,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<DistributionCategory[]>(categories);
  const [simAmount, setSimAmount] = useState<string>('');
  const [saveMsg, setSaveMsg] = useState('');
  const [customBase, setCustomBase] = useState('');

  // Working days state
  const [wdEditMode, setWdEditMode] = useState(false);
  const [wdDraft, setWdDraft] = useState<WorkingDaysConfig>(workingDays);
  const [wdSaveMsg, setWdSaveMsg] = useState('');

  React.useEffect(() => {
    setDraft(categories);
  }, [categories]);

  React.useEffect(() => {
    setWdDraft(workingDays);
  }, [workingDays]);

  // AUTOMATED: Calculate all financial projections reactively
  const projections = useMemo<FinancialProjection>(() => {
    return calculateFinancialProjections(
      editMode ? draft : categories,
      wdEditMode ? wdDraft : workingDays,
      salesRecords
    );
  }, [draft, categories, editMode, wdDraft, workingDays, wdEditMode, salesRecords]);

  // Data calculations
  const totalPct = draft.reduce((s, c) => s + (c.percentage ?? 0), 0);
  const isValid = totalPct <= 100;
  const simBase = parseFloat(simAmount) || 0;
  const totalSales = salesRecords.reduce((s, r) => s + r.amount, 0);
  const base = customBase ? Math.max(0, parseFloat(customBase) || 0) : totalSales;

  const simResults = computeDistribution(simBase, editMode ? draft : categories);
  const viewResults = computeDistribution(base, categories);

  // Get active days for display
  const activeDaysCount = DAYS_OF_WEEK.filter((_, i) => 
    (wdDraft[['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][i] as keyof WorkingDaysConfig])
  ).length;
  const computedDaysPerMonth = Math.round(activeDaysCount * 4.33);

  // Break-even status for simulator
  const breakEvenStatus = getBreakEvenStatus(simBase, projections.breakEvenSales);

  // Distribution functions
  const updatePct = (id: string, val: string) => {
    const n = Math.max(0, Math.min(100, parseFloat(val) || 0));
    setDraft(d => d.map(c => c.id === id ? { ...c, percentage: n } : c));
  };

  const updateAmount = (id: string, val: string) => {
    setDraft(d => d.map(c => c.id === id ? { ...c, amount: Math.max(0, parseFloat(val) || 0) } : c));
  };

  const updateName = (id: string, val: string) => {
    setDraft(d => d.map(c => c.id === id ? { ...c, name: val } : c));
  };

  const addCategory = () => {
    setDraft(d => [...d, {
      id: `d${Date.now()}`,
      name: 'New Category',
      percentage: 0,
      amount: 0,
      color: COLORS[d.length % COLORS.length],
      bgColor: '#f1f5f9',
    }]);
  };

  const removeCategory = (id: string) => {
    setDraft(d => d.filter(c => c.id !== id));
  };

  const handleSave = async () => {
    if (!isValid) return;
    await onSave(draft);
    setEditMode(false);
    setSaveMsg('Saved!');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const handleCancel = () => {
    setDraft(categories);
    setEditMode(false);
  };

  // Working days functions
  const toggleDay = (dayIndex: number) => {
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
    const dayKey = dayKeys[dayIndex];
    const updated = { ...wdDraft, [dayKey]: !wdDraft[dayKey] };
    
    // Auto-update working days per month
    const activeDays = DAYS_OF_WEEK.filter((_, i) => updated[dayKeys[i]]).length;
    const newDaysPerMonth = Math.round(activeDays * 4.33);
    updated.workingDaysPerMonth = newDaysPerMonth;
    
    setWdDraft(updated);
  };

  const handleWdSave = async () => {
    try {
      await onSaveWorkingDays(wdDraft);
      setWdEditMode(false);
      setWdSaveMsg('Saved!');
      setTimeout(() => setWdSaveMsg(''), 2000);
    } catch (error) {
      console.error('Error saving working days:', error);
      setWdSaveMsg('Error saving');
      setTimeout(() => setWdSaveMsg(''), 3000);
    }
  };

  const handleWdCancel = () => {
    setWdDraft(workingDays);
    setWdEditMode(false);
    setWdSaveMsg('');
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Distribution</h1>
          <p className="page-sub">Automatic financial distribution based on total sales</p>
        </div>
        {canEdit && !editMode && (
          <button className="btn-primary" onClick={() => setEditMode(true)}>
            <i className="ti ti-edit" aria-hidden="true" /> Edit Distribution
          </button>
        )}
        {editMode && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={!isValid || saving}
              style={{ background: !isValid ? '#9ca3af' : saving ? '#4f46e5' : undefined }}
            >
              <i className={`ti ${saving ? 'ti-loader-2' : saveMsg ? 'ti-check' : 'ti-device-floppy'}`}
                aria-hidden="true" />
              {' '}{saving ? 'Saving...' : saveMsg || 'Save Changes'}
            </button>
            <button className="btn-ghost" onClick={handleCancel}>Cancel</button>
          </div>
        )}
      </div>

      {/* ── TARGET FINANCIAL PROJECTIONS ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
          📊 Target Projections (What you want to achieve)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            {
              label: 'Break-even Sales',
              value: formatPeso(projections.breakEvenSales),
              accent: '#ef4444',
              icon: 'ti-trending-up',
              tip: 'Total monthly operating cost ÷ distribution %',
              formula: `₱${projections.totalMonthlyOperatingCost.toFixed(2)} ÷ ${(projections.breakEvenSales > 0 ? ((projections.totalMonthlyOperatingCost / projections.breakEvenSales) * 100).toFixed(1) : 0)}%`,
            },
            {
              label: 'Daily Sales Target',
              value: formatPeso(projections.dailySalesTarget),
              accent: '#4f46e5',
              icon: 'ti-target',
              tip: `Break-even ÷ ${projections.workingDaysPerMonth} working days`,
              formula: `₱${projections.breakEvenSales.toFixed(2)} ÷ ${projections.workingDaysPerMonth} days`,
            },
            {
              label: 'Projected Monthly',
              value: formatPeso(projections.projectedMonthly),
              accent: '#10b981',
              icon: 'ti-calendar-stats',
              tip: `Daily target × ${projections.workingDaysPerMonth} days`,
              formula: `₱${projections.dailySalesTarget.toFixed(2)} × ${projections.workingDaysPerMonth} days`,
            },
            {
              label: 'Target Profit Margin',
              value: `${projections.profitMarginTarget.toFixed(1)}%`,
              accent: '#f59e0b',
              icon: 'ti-percentage',
              tip: '100% - distribution %',
              formula: `100% - ${(100 - projections.profitMarginTarget).toFixed(1)}% = ${projections.profitMarginTarget.toFixed(1)}%`,
            },
          ].map(c => (
            <div key={c.label} className="stat-card"
              style={{ paddingTop: 14 }}
              title={c.tip}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <i className={`ti ${c.icon}`} style={{ fontSize: 16, color: c.accent }} aria-hidden="true" />
                <div className="stat-label">{c.label}</div>
              </div>
              <div className="stat-value" style={{ fontSize: 20 }}>{c.value}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                {c.formula}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ACTUAL PROFIT METRICS (Based on Real Sales) ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
          💰 Actual Results (Based on real sales data)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            {
              label: 'Total Sales',
              value: formatPeso(projections.totalActualSales),
              accent: '#3b82f6',
              icon: 'ti-cash',
              tip: 'Sum of all sales recorded',
              formula: `${salesRecords.length} sales recorded`,
            },
            {
              label: 'Distributed Amount',
              value: formatPeso(projections.totalDistributedAmount),
              accent: '#8b5cf6',
              icon: 'ti-git-branch',
              tip: 'Total sales × distribution %',
              formula: `₱${projections.totalActualSales.toFixed(2)} × ${(projections.totalActualSales > 0 ? ((projections.totalDistributedAmount / projections.totalActualSales) * 100).toFixed(1) : 0)}%`,
            },
            {
              label: 'Actual Profit Amount',
              value: formatPeso(projections.actualProfitAmount),
              accent: '#06b6d4',
              icon: 'ti-piggy-bank',
              tip: 'Total sales - distributed amount',
              formula: `₱${projections.totalActualSales.toFixed(2)} - ₱${projections.totalDistributedAmount.toFixed(2)}`,
            },
            {
              label: 'Actual Profit Margin',
              value: `${projections.actualProfitMargin.toFixed(1)}%`,
              accent: '#10b981',
              icon: 'ti-chart-line',
              tip: '(Profit amount ÷ total sales) × 100%',
              formula: `(₱${projections.actualProfitAmount.toFixed(2)} ÷ ₱${projections.totalActualSales.toFixed(2)}) × 100%`,
            },
          ].map(c => (
            <div key={c.label} className="stat-card"
              style={{ paddingTop: 14 }}
              title={c.tip}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <i className={`ti ${c.icon}`} style={{ fontSize: 16, color: c.accent }} aria-hidden="true" />
                <div className="stat-label">{c.label}</div>
              </div>
              <div className="stat-value" style={{ fontSize: 20 }}>{c.value}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                {c.formula}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* ── LEFT COLUMN: Distribution Rules + Working Days ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Distribution Rules */}
          <div className="page-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 3 }}>
                  Distribution Rules (Percentage)
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {editMode
                    ? 'Edit names, percentages, and monthly costs'
                    : 'Fixed percentage allocation per category'}
                </div>
              </div>
              {editMode && (
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                  background: isValid ? '#dcfce7' : '#fee2e2',
                  color: isValid ? '#15803d' : '#dc2626',
                }}>
                  {totalPct.toFixed(1)}% {totalPct <= 100 ? '✓' : '> 100%'}
                </span>
              )}
            </div>

            <div>
              {(editMode ? draft : categories).map(cat => (
                <div key={cat.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 0', borderBottom: '0.5px solid var(--border)',
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: cat.color, flexShrink: 0,
                  }} />

                  {editMode ? (
                    <>
                      <input
                        value={cat.name}
                        onChange={e => updateName(cat.id, e.target.value)}
                        style={{
                          flex: 1, padding: '5px 8px', fontSize: 13,
                          border: '1px solid var(--border)', borderRadius: 6,
                          background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit',
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <input
                          type="number" min="0" max="100" step="0.5"
                          value={cat.percentage ?? 0}
                          onChange={e => updatePct(cat.id, e.target.value)}
                          style={{
                            width: 55, padding: '5px 6px', fontSize: 13, textAlign: 'right',
                            border: '1px solid var(--border)', borderRadius: 6,
                            background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit',
                          }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>%</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>₱</span>
                        <input
                          type="number" min="0" step="0.01"
                          value={cat.amount ?? 0}
                          onChange={e => updateAmount(cat.id, e.target.value)}
                          placeholder="Monthly cost"
                          style={{
                            width: 80, padding: '5px 6px', fontSize: 13, textAlign: 'right',
                            border: '1px solid var(--border)', borderRadius: 6,
                            background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit',
                          }}
                        />
                      </div>
                      <button
                        onClick={() => removeCategory(cat.id)}
                        style={{
                          width: 26, height: 26, flexShrink: 0,
                          border: '1px solid #fecaca', background: '#fee2e2',
                          color: '#dc2626', borderRadius: 6, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                        }}
                      >
                        <i className="ti ti-trash" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#111827' }}>{cat.name}</span>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 99,
                        background: `${cat.color}20`, color: cat.color,
                      }}>
                        {cat.percentage}%
                      </span>
                      {cat.amount ? (
                        <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 80, textAlign: 'right' }}>
                          {formatPeso(cat.amount)}/mo
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Total row */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingTop: 12, marginTop: 4, borderTop: '2px solid var(--border)',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Total</span>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {!editMode && categories.some(c => c.amount) && (
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {formatPeso(projections.totalMonthlyOperatingCost)}/mo
                  </span>
                )}
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 99,
                  background: isValid ? '#dcfce7' : '#e2e8f0',
                  color: isValid ? '#15803d' : '#1e293b',
                }}>
                  {(editMode
                    ? totalPct
                    : categories.reduce((s, c) => s + (c.percentage ?? 0), 0)
                  ).toFixed(1)}%
                </span>
              </div>
            </div>

            {editMode && (
              <button
                onClick={addCategory}
                style={{
                  marginTop: 12, width: '100%', padding: '8px',
                  border: '1px dashed var(--border)', borderRadius: 8,
                  background: 'none', color: 'var(--accent)', fontSize: 13,
                  fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <i className="ti ti-plus" aria-hidden="true" /> Add Category
              </button>
            )}
          </div>

          {/* ── INTEGRATED Working Days Configuration ── */}
          <div className="page-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 3 }}>
                  Working Days Configuration
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Select operating days</div>
              </div>
              {canEdit && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {wdEditMode && (
                    <button
                      className="btn-primary"
                      onClick={handleWdSave}
                      disabled={saving}
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      <i className={`ti ${wdSaveMsg || saving ? 'ti-check' : 'ti-device-floppy'}`} aria-hidden="true" />
                      {' '}{saving ? 'Saving...' : wdSaveMsg || 'Save'}
                    </button>
                  )}
                  <button
                    className={wdEditMode ? 'btn-ghost' : 'btn-primary'}
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => wdEditMode ? handleWdCancel() : setWdEditMode(true)}
                    disabled={saving}
                  >
                    <i className={`ti ${wdEditMode ? 'ti-x' : 'ti-edit'}`} aria-hidden="true" />
                    {' '}{wdEditMode ? 'Cancel' : 'Edit'}
                  </button>
                </div>
              )}
            </div>

            {/* Day toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 12 }}>
              {DAYS_OF_WEEK.map((day, i) => {
                const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
                const isActive = wdDraft[dayKeys[i]];
                return (
                  <button
                    key={day}
                    onClick={() => wdEditMode && toggleDay(i)}
                    disabled={!wdEditMode}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 8,
                      border: isActive ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                      background: isActive ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--muted)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: 12,
                      cursor: wdEditMode ? 'pointer' : 'default',
                      transition: 'all .15s',
                      fontFamily: 'inherit',
                      textAlign: 'center',
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Days per month */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', background: '#f9fafb',
              borderRadius: 8, border: '1px solid #e5e7eb',
              marginBottom: 10,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Working Days</span>
              <input
                type="number" min="1" max="31"
                value={wdDraft.workingDaysPerMonth}
                onChange={e => setWdDraft(prev => ({ ...prev, workingDaysPerMonth: Math.max(1, parseInt(e.target.value) || 22) }))}
                disabled={!wdEditMode}
                style={{
                  width: 50, padding: '5px 8px',
                  border: '1px solid #d1d5db', borderRadius: 6,
                  fontSize: 12, fontWeight: 600, textAlign: 'center',
                  background: wdEditMode ? 'white' : '#f9fafb',
                  cursor: wdEditMode ? 'text' : 'default',
                }}
              />
              <span style={{ fontSize: 12, color: '#6b7280' }}>days/month</span>
            </div>

            {/* Info hint */}
            <div style={{
              padding: '8px 10px', borderRadius: 6,
              background: '#eff6ff', border: '1px solid #bfdbfe',
              fontSize: 11, color: '#0c4a6e',
            }}>
              <i className="ti ti-info-circle" style={{ marginRight: 4 }} aria-hidden="true" />
              {activeDaysCount} day{activeDaysCount !== 1 ? 's' : ''}/week × 4.33 = {computedDaysPerMonth} days/month
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Simulator + Based on Total Sales ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Distribution Simulator */}
          <div className="page-card">
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 3 }}>
              Distribution Simulator
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
              Enter a sales amount to see how it gets distributed
            </div>

            <div style={{ position: 'relative', marginBottom: 16 }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                fontSize: 15, fontWeight: 700, color: 'var(--accent)',
              }}>₱</span>
              <input
                className="form-input"
                type="number" min="0" step="0.01" placeholder="0.00"
                value={simAmount}
                onChange={e => setSimAmount(e.target.value)}
                style={{ paddingLeft: 28 }}
              />
            </div>

            {simBase > 0 ? (
              <>
                {simResults.map(r => (
                  <div key={r.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{r.name} ({r.percentage}%)</span>
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        background: `${r.color}18`, color: r.color,
                      }}>
                        {formatPeso(r.amount ?? 0)}
                      </span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', background: r.color, borderRadius: 3,
                        width: `${r.percentage}%`, transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                ))}
                <div style={{
                  marginTop: 12, paddingTop: 10, borderTop: '2px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Total Distributed</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>
                    {formatPeso(simBase)}
                  </span>
                </div>

                {projections.breakEvenSales > 0 && (
                  <div style={{
                    marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: 12,
                    background: breakEvenStatus.status === 'above' ? '#dcfce7' : '#fee2e2',
                    color: breakEvenStatus.status === 'above' ? '#15803d' : '#dc2626',
                    border: `1px solid ${breakEvenStatus.status === 'above' ? '#bbf7d0' : '#fecaca'}`,
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}>
                    <i className={`ti ${breakEvenStatus.status === 'above' ? 'ti-check' : 'ti-alert-triangle'}`}
                      style={{ fontSize: 13 }} aria-hidden="true" />
                    {breakEvenStatus.status === 'above'
                      ? `Above break-even by ${formatPeso(breakEvenStatus.difference)} (${breakEvenStatus.percentage}%)`
                      : `${formatPeso(breakEvenStatus.difference)} below break-even`}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)' }}>
                <i className="ti ti-calculator" style={{ fontSize: 36, opacity: .3, display: 'block', marginBottom: 6 }} aria-hidden="true" />
                <div style={{ fontSize: 13 }}>Enter an amount to simulate</div>
              </div>
            )}
          </div>

          {/* Distribution Based on Total Sales */}
          <div className="page-card">
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 3 }}>
              Distribution (Based on Total Sales)
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
              This shows how the total sales amount is distributed.
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.5)', borderRadius: 10,
              padding: '10px 14px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 12,
              border: '1px solid rgba(0,0,0,0.1)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Total Sales</span>
              <input
                style={{
                  flex: 1, border: '1px solid rgba(0,0,0,0.15)', borderRadius: 7,
                  padding: '6px 10px', fontFamily: 'var(--mono)', fontSize: 14,
                  fontWeight: 700, color: '#111827', background: 'rgba(255,255,255,0.8)',
                  outline: 'none',
                }}
                type="number" min="0" step="0.01"
                value={customBase !== '' ? customBase : String(totalSales)}
                onChange={e => setCustomBase(e.target.value)}
              />
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Category', 'Bar', 'Amount'].map(h => (
                    <th key={h} style={{
                      textAlign: h === 'Amount' ? 'right' : 'left',
                      fontSize: 10.5, fontWeight: 700, color: '#374151',
                      textTransform: 'uppercase', letterSpacing: '.7px',
                      padding: '0 0 10px', borderBottom: '1px solid rgba(0,0,0,0.12)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viewResults.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '9px 0', fontWeight: 600, color: '#111827' }}>
                      {r.name} ({r.percentage}%)
                    </td>
                    <td style={{ padding: '9px 16px 9px 0' }}>
                      <div style={{ height: 5, background: 'rgba(0,0,0,0.1)', borderRadius: 99, width: 100 }}>
                        <div style={{ height: '100%', width: `${r.percentage}%`, background: r.color, borderRadius: 99 }} />
                      </div>
                    </td>
                    <td style={{ padding: '9px 0', textAlign: 'right' }}>
                      <span style={{
                        background: r.color, padding: '3px 10px', borderRadius: 7,
                        color: '#fff', fontWeight: 700, fontSize: 12, display: 'inline-block',
                      }}>
                        {formatPeso(r.amount ?? 0)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{
              borderTop: '2px solid rgba(0,0,0,0.1)', marginTop: 10, paddingTop: 14,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Total Distributed</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 700, color: 'var(--accent)' }}>
                {formatPeso(base)}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DistributionPage;