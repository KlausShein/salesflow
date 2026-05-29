import {
  SalesRecord,
  ExpenseRecord,
  DistributionCategory,
  DistributionResult,
  DashboardStats,
} from '../types';

export const formatPeso = (value: number): string =>
  '₱' +
  Math.abs(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const formatDate = (date: Date = new Date()): string =>
  date.toLocaleDateString('en-PH', {
    month: 'long',
    day:   'numeric',
    year:  'numeric',
  });

export const isoToDisplay = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'long',
    day:   'numeric',
    year:  'numeric',
  });
};

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

export const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const computeDistribution = (
  base:       number,
  categories: DistributionCategory[]
): DistributionResult[] =>
  categories.map((cat) => ({ ...cat, amount: (base * (cat.percentage || 0)) / 100 }));

export const computeDashboardStats = (
  sales:       SalesRecord[],
  expenses:    ExpenseRecord[],
  todayIsoStr: string
): DashboardStats => {

  // ── Yesterday's date ──────────────────────────────────────
  const d = new Date(todayIsoStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  const yesterdayIsoStr = d.toISOString().slice(0, 10);

  // ── Today's totals ────────────────────────────────────────
  const totalSalesToday    = sales
    .filter(s => s.date === todayIsoStr)
    .reduce((sum, s) => sum + s.amount, 0);

  const totalExpensesToday = expenses
    .filter(e => e.date === todayIsoStr)
    .reduce((sum, e) => sum + e.amount, 0);

  const netIncomeToday = totalSalesToday - totalExpensesToday;

  // ── Yesterday's totals ────────────────────────────────────
  const totalSalesYesterday = sales
    .filter(s => s.date === yesterdayIsoStr)
    .reduce((sum, s) => sum + s.amount, 0);

  const totalExpensesYesterday = expenses
    .filter(e => e.date === yesterdayIsoStr)
    .reduce((sum, e) => sum + e.amount, 0);

  const netIncomeYesterday = totalSalesYesterday - totalExpensesYesterday;

  // ── All-time totals for remaining balance ─────────────────
  const totalSalesAll   = sales.reduce((sum, s) => sum + s.amount, 0);
  const totalExpAll     = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBalance = totalSalesAll - totalExpAll;

  // ── Percentage change helper ──────────────────────────────
  const pctChange = (today: number, yesterday: number): number => {
    if (yesterday === 0 && today === 0) return 0;
    if (yesterday === 0) return 100;
    const change = ((today - yesterday) / Math.abs(yesterday)) * 100;
    return Math.round(change * 10) / 10;   // 1 decimal place
  };

  return {
    totalSalesToday,
    totalExpensesToday,
    netIncomeToday,
    remainingBalance,
    salesChangePct:    pctChange(totalSalesToday,    totalSalesYesterday),
    expensesChangePct: pctChange(totalExpensesToday, totalExpensesYesterday),
    netChangePct:      pctChange(netIncomeToday,     netIncomeYesterday),
  };
};