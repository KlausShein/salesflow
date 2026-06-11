import { DistributionCategory, FinancialProjection, WorkingDaysConfig } from '../types';

/**
 * Calculate working days per month from the working days configuration
 * Formula: Active days per week × 4.33 (average weeks per month)
 */
export const calculateWorkingDaysPerMonth = (config: WorkingDaysConfig): number => {
  if (!config) return 22; // Default fallback
  
  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  const activeDaysCount = dayKeys.filter(key => config[key]).length;
  
  return Math.round(activeDaysCount * 4.33);
};

/**
 * Calculate all financial projections based on distribution categories, working days, and sales
 * 
 * Formulas:
 * - Total Operating Cost = Sum of all category amounts
 * - Total Distribution % = Sum of all category percentages
 * - Break-even Sales = Total Operating Cost ÷ (Total Distribution % ÷ 100)
 * - Daily Sales Target = Break-even Sales ÷ Working Days Per Month
 * - Projected Monthly = Daily Sales Target × Working Days Per Month
 * - Profit Margin (Target) = 100% - Total Distribution %
 * 
 * NEW - ACTUAL PROFIT (Based on Real Sales):
 * - Total Actual Sales = Sum of all sales records
 * - Total Distributed Amount = Total Actual Sales × (Total Distribution % ÷ 100)
 * - Actual Profit Amount = Total Actual Sales - Total Distributed Amount
 * - Actual Profit Margin % = (Actual Profit Amount ÷ Total Actual Sales) × 100%
 */
export const calculateFinancialProjections = (
  categories: DistributionCategory[],
  workingDays: WorkingDaysConfig,
  salesRecords: any[] = []
): FinancialProjection => {
  // Ensure defaults
  if (!categories) categories = [];
  if (!workingDays) workingDays = { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false, workingDaysPerMonth: 22 };

  // Calculate total monthly operating cost (sum of all category amounts)
  const totalMonthlyOperatingCost = categories.reduce((sum, cat) => {
    const amount = parseFloat(String(cat.amount ?? 0)) || 0;
    return sum + Math.max(0, amount);
  }, 0);

  // Calculate total distribution percentage
  const totalDistributionPct = categories.reduce((sum, cat) => {
    const percentage = parseFloat(String(cat.percentage ?? 0)) || 0;
    return sum + Math.max(0, Math.min(100, percentage));
  }, 0);

  // Get working days per month (already calculated in config, or recalculate)
  const workingDaysPerMonth = workingDays?.workingDaysPerMonth ?? calculateWorkingDaysPerMonth(workingDays);
  const validWorkingDays = Math.max(1, workingDaysPerMonth); // Ensure at least 1 day

  // ─── TARGET PROJECTIONS ────────────────────────────────────

  // Calculate Break-even Sales
  // Formula: Total Operating Cost ÷ (Total Distribution % ÷ 100)
  // If distribution % is 0, break-even is 0 (nothing to distribute)
  const breakEvenSales = totalDistributionPct > 0
    ? totalMonthlyOperatingCost / (totalDistributionPct / 100)
    : 0;

  // Calculate Daily Sales Target
  // Formula: Break-even Sales ÷ Working Days Per Month
  const dailySalesTarget = validWorkingDays > 0
    ? breakEvenSales / validWorkingDays
    : 0;

  // Calculate Projected Monthly
  // Formula: Daily Sales Target × Working Days Per Month
  const projectedMonthly = dailySalesTarget * validWorkingDays;

  // Calculate Profit Margin Target
  // Formula: 100% - Total Distribution %
  const profitMarginTarget = Math.max(0, Math.min(100, 100 - totalDistributionPct));

  // ─── ACTUAL PROFIT (Based on Real Sales Records) ───────────

  // Calculate total actual sales from sales records
  const totalActualSales = salesRecords.reduce((sum, record) => {
    const amount = parseFloat(String(record.amount ?? 0)) || 0;
    return sum + Math.max(0, amount);
  }, 0);

  // Calculate total distributed amount (based on actual sales and distribution %)
  const totalDistributedAmount = totalDistributionPct > 0
    ? totalActualSales * (totalDistributionPct / 100)
    : 0;

  // Calculate actual profit amount
  const actualProfitAmount = totalActualSales - totalDistributedAmount;

  // Calculate actual profit margin %
  // Formula: (Actual Profit Amount ÷ Total Actual Sales) × 100%
  const actualProfitMargin = totalActualSales > 0
    ? (actualProfitAmount / totalActualSales) * 100
    : 0;

  // Return rounded values
  return {
    breakEvenSales: Math.round(breakEvenSales * 100) / 100,
    dailySalesTarget: Math.round(dailySalesTarget * 100) / 100,
    projectedMonthly: Math.round(projectedMonthly * 100) / 100,
    totalMonthlyOperatingCost: Math.round(totalMonthlyOperatingCost * 100) / 100,
    profitMarginTarget: Math.round(profitMarginTarget * 100) / 100,
    workingDaysPerMonth: validWorkingDays,
    // NEW - Actual profit metrics
    totalActualSales: Math.round(totalActualSales * 100) / 100,
    totalDistributedAmount: Math.round(totalDistributedAmount * 100) / 100,
    actualProfitAmount: Math.round(actualProfitAmount * 100) / 100,
    actualProfitMargin: Math.round(actualProfitMargin * 100) / 100,
  };
};

/**
 * Validate distribution categories
 * Ensures percentages add up to 100%
 */
export const isValidDistribution = (categories: DistributionCategory[]): boolean => {
  if (!categories || categories.length === 0) return false;
  
  const totalPct = categories.reduce((sum, cat) => sum + (cat.percentage ?? 0), 0);
  return Math.abs(totalPct - 100) < 0.01; // Allow 0.01% tolerance for rounding
};

/**
 * Calculate the status of sales against break-even
 */
export const getBreakEvenStatus = (currentSales: number, breakEvenSales: number): {
  status: 'above' | 'below' | 'at';
  difference: number;
  percentage: number;
} => {
  if (breakEvenSales === 0) {
    return { status: 'at', difference: 0, percentage: 0 };
  }

  const difference = currentSales - breakEvenSales;
  const percentage = Math.round((currentSales / breakEvenSales) * 100);

  if (difference > 0.01) {
    return { status: 'above', difference, percentage };
  } else if (difference < -0.01) {
    return { status: 'below', difference: Math.abs(difference), percentage };
  } else {
    return { status: 'at', difference: 0, percentage: 100 };
  }
};

/**
 * Format projection values for display
 */
export const formatProjection = (value: number): string => {
  if (value === 0) return '0.00';
  if (value < 0.01) return '0.00';
  
  const formatted = value.toFixed(2);
  return formatted;
};