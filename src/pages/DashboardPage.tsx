import React, { useState, useCallback, useEffect } from 'react';
import { SalesRecord, ExpenseRecord, DistributionCategory } from '../types';
import { formatPeso, computeDistribution, computeDashboardStats, todayIso } from '../utils/helpers';
import AnalyticsPanel from '../components/dashboard/AnalyticsPanel';

interface DashboardPageProps {
  sales:         SalesRecord[];
  expenses:      ExpenseRecord[];
  categories:    DistributionCategory[];
  onSaveSale:    (date: string, amount: number, notes: string) => void;
  selectedDate?: string;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
  sales, expenses, categories, onSaveSale, selectedDate,
}) => {
  const activeDate = selectedDate ?? todayIso();

  const [salesAmount, setSalesAmount] = useState<string>('');
  const [entryDate,   setEntryDate]   = useState<string>(activeDate);
  const [notes,       setNotes]       = useState<string>('');
  const [saved,       setSaved]       = useState(false);

  useEffect(() => {
    setEntryDate(activeDate);
  }, [activeDate]);

  const amount      = Math.max(0, parseFloat(salesAmount) || 0);
  const distResults = computeDistribution(amount, categories);
  const stats       = computeDashboardStats(sales, expenses, activeDate);

  const handleSave = useCallback(() => {
    if (amount <= 0) return;
    onSaveSale(entryDate, amount, notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [amount, entryDate, notes, onSaveSale]);

  const recentSales    = sales.slice(0, 5);
  const recentExpenses = expenses.slice(0, 5);

  return (
    <div className="content">

      {/* ── Stat cards ── */}
      <div className="stats-row">
        <StatCard
          icon="ti-trending-up"
          iconBg="#eef2ff" iconColor="#4f46e5"
          label="Total Sales Today"
          value={formatPeso(stats.totalSalesToday || 0)}
          change={stats.salesChangePct}
          changeDir={(stats.salesChangePct ?? 0) >= 0 ? 'up' : 'dn'}
        />
        <StatCard
          icon="ti-receipt-2"
          iconBg="#fee2e2" iconColor="#dc2626"
          label="Total Expenses Today"
          value={formatPeso(stats.totalExpensesToday || 0)}
          change={stats.expensesChangePct}
          changeDir={(stats.expensesChangePct ?? 0) >= 0 ? 'dn' : 'up'}
        />
        <StatCard
          icon="ti-pig-money"
          iconBg="#d1fae5" iconColor="#059669"
          label="Net Income Today"
          value={formatPeso(stats.netIncomeToday || 0)}
          change={stats.netChangePct}
          changeDir={(stats.netChangePct ?? 0) >= 0 ? 'up' : 'dn'}
        />
        <StatCard
          icon="ti-wallet"
          iconBg="#fef3c7" iconColor="#d97706"
          label="Remaining Balance"
          value={formatPeso(stats.remainingBalance || 0)}
          note="After distribution & expenses"
        />
      </div>

      {/* ── Mid row ── */}
      <div className="mid-grid">

        {/* Daily Sales Entry */}
        <div className="entry-card">
          <div className="entry-title">Daily Sales Entry</div>
          <div className="entry-sub">
            Enter the total sales for {activeDate === todayIso() ? 'today' : entryDate}
          </div>

          <label className="form-label">Total Sales Amount</label>
          <div className="amount-wrap">
            <div className="amount-symbol">₱</div>
            <input
              className="amount-input"
              type="number"
              min="0"
              step="0.01"
              value={salesAmount}
              onChange={(e) => setSalesAmount(e.target.value)}
              placeholder="0.00"
              aria-label="Total sales amount"
            />
          </div>
          <div className="form-hint">Enter 0.00 if no sales today</div>

          <div className="form-row">
            <div>
              <label className="form-label">Date</label>
              <div style={{ position: 'relative' }}>
                <i
                  className="ti ti-calendar"
                  style={{
                    position: 'absolute', left: 11, top: '50%',
                    transform: 'translateY(-50%)', color: '#9ca3af',
                    fontSize: 15, pointerEvents: 'none',
                  }}
                  aria-hidden="true"
                />
                <input
                  className="form-input"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  style={{ paddingLeft: 34 }}
                  aria-label="Entry date"
                />
              </div>
            </div>
            <div>
              <label className="form-label">Notes (Optional)</label>
              <textarea
                className="form-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes..."
                aria-label="Notes"
              />
            </div>
          </div>

          <button
            className={`btn-save${saved ? ' success' : ''}`}
            onClick={handleSave}
            disabled={saved}
          >
            <i
              className={`ti ${saved ? 'ti-check' : 'ti-device-floppy'}`}
              style={{ fontSize: 16 }}
              aria-hidden="true"
            />
            {saved ? 'Saved!' : 'Save Sales'}
          </button>
        </div>

        {/* Distribution Breakdown */}
        <div className="dist-card">
          <div className="dist-card-title">Distribution Breakdown</div>
          <div className="dist-card-sub">Automatic computation based on percentage</div>

          {distResults.map((r) => {
            const barW = Math.round(((r.percentage || 0) / 40) * 100);
            return (
              <div key={r.id} className="dist-row">
                <div className="dist-dot" style={{ background: r.color }} />
                <div className="dist-name">{r.name}</div>
                <div className="dist-pct">{r.percentage}%</div>
                <div className="dist-bar-track">
                  <div
                    className="dist-bar-fill"
                    style={{ width: `${barW}%`, background: r.color }}
                  />
                </div>
                <div className="dist-amount">{formatPeso(r.amount || 0)}</div>
              </div>
            );
          })}

          <div className="dist-total-row">
            <div className="dist-total-label">Total Distribution</div>
            <div className="dist-total-pct">100%</div>
            <div className="dist-full-bar">
              <div className="dist-full-fill" />
            </div>
            <div className="dist-total-val">{formatPeso(amount)}</div>
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="bottom-grid">

        {/* Recent Sales */}
        <div className="table-card">
          <div className="tc-header">
            <div>
              <div className="tc-title">Recent Sales</div>
              <div className="tc-sub">Latest sales records</div>
            </div>
            <button className="view-all-btn">
              <i className="ti ti-list" aria-hidden="true" />
              View All Sales
            </button>
          </div>
          <table className="data-table" aria-label="Recent sales">
            <thead>
              <tr>
                <th>Date</th>
                <th className="right">Total Sales</th>
                <th className="right">Distributed</th>
                <th>Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((r) => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--sub)' }}>{r.displayDate}</td>
                  <td className="right mono" style={{ color: '#4f46e5', fontWeight: 700 }}>
                    {formatPeso(r.amount)}
                  </td>
                  <td className="right mono" style={{ color: '#059669', fontWeight: 700 }}>
                    {formatPeso(r.distributed)}
                  </td>
                  <td>
                    {r.notes
                      ? <span style={{ color: 'var(--sub)' }}>{r.notes}</span>
                      : <span style={{ color: 'var(--muted)' }}>–</span>
                    }
                  </td>
                  <td>
                    <span className="badge-done">{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Expenses */}
        <div className="table-card">
          <div className="tc-header">
            <div>
              <div className="tc-title">Recent Expenses</div>
              <div className="tc-sub">Latest expense records</div>
            </div>
            <button className="view-all-btn">
              <i className="ti ti-list" aria-hidden="true" />
              View All Expenses
            </button>
          </div>
          <table className="data-table" aria-label="Recent expenses">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th className="right">Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentExpenses.map((e) => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--sub)' }}>{e.displayDate}</td>
                  <td style={{ fontWeight: 500 }}>{e.description}</td>
                  <td className="right mono" style={{ color: 'var(--red)', fontWeight: 700 }}>
                    {formatPeso(e.amount)}
                  </td>
                  <td>
                    <button className="action-btn" aria-label={`View ${e.description}`}>
                      <i className="ti ti-eye" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Analytics Panel ── */}
      <AnalyticsPanel sales={sales} expenses={expenses} />

    </div>
  );
};

/* ── StatCard sub-component ── */
interface StatCardProps {
  icon:       string;
  iconBg:     string;
  iconColor:  string;
  label:      string;
  value:      string;
  change?:    number;
  changeDir?: 'up' | 'dn';
  note?:      string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon, iconBg, iconColor, label, value, change, changeDir, note,
}) => (
  <div className="stat-card">
    <div className="stat-icon-wrap" style={{ background: iconBg, color: iconColor }}>
      <i className={`ti ${icon}`} aria-hidden="true" />
    </div>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    {change !== undefined && changeDir && (
      <span className={`stat-change ${changeDir}`}>
        <i
          className={`ti ${changeDir === 'up' ? 'ti-arrow-up-right' : 'ti-arrow-down-right'}`}
          style={{ fontSize: 11 }}
          aria-hidden="true"
        />
        {change > 0 ? '+' : ''}{change}% from yesterday
      </span>
    )}
    {note && <div className="stat-note">{note}</div>}
  </div>
);

export default DashboardPage;