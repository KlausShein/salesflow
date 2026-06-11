import {
  SalesRecord,
  ExpenseRecord,
  DistributionCategory,
  Customer,
  SystemUser,
  BusinessSettings,
  NavItem,
  ChartDataPoint
} from '../types';

export const DISTRIBUTION_CATEGORIES: DistributionCategory[] = [
  { id: 'd1', name: 'Equity',      percentage: 40, color: '#4f46e5', bgColor: '#eef2ff' },
  { id: 'd2', name: 'Rental',      percentage: 15, color: '#3b82f6', bgColor: '#dbeafe' },
  { id: 'd3', name: 'Electricity', percentage: 12, color: '#f59e0b', bgColor: '#fef3c7' },
  { id: 'd4', name: 'Water',       percentage:  8, color: '#06b6d4', bgColor: '#cffafe' },
  { id: 'd5', name: 'Share',       percentage: 15, color: '#10b981', bgColor: '#dcfce7' },
  { id: 'd6', name: 'Savings',     percentage: 10, color: '#ec4899', bgColor: '#fce7f3' },
];

export const TODAY = '';
export const TODAY_DISPLAY = '';

export const SEED_SALES: SalesRecord[] = [];

export const SEED_EXPENSES: ExpenseRecord[] = [];

export const CUSTOMERS: Customer[] = [];

export const SYSTEM_USERS: SystemUser[] = [];

export const BUSINESS_SETTINGS: BusinessSettings = {
  businessName: 'PrintPOS Print Shop',
  owner:        '',
  address:      '',
  phone:        '',
  email:        '',
};

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',    icon: 'ti-layout-dashboard', section: 'main'   },
  { id: 'sales',        label: 'Sales',        icon: 'ti-chart-bar',        section: 'main'   },
  { id: 'expenses',     label: 'Expenses',     icon: 'ti-receipt-2',        section: 'main'   },
  { id: 'distribution', label: 'Distribution', icon: 'ti-arrows-split-2',   section: 'main'   },
  { id: 'reports',      label: 'Reports',      icon: 'ti-file-analytics',   section: 'main'   },
  { id: 'customers',    label: 'Customers',    icon: 'ti-users',            section: 'main'   },
  { id: 'users',        label: 'Users',        icon: 'ti-user-shield',      section: 'system' },
  { id: 'settings',     label: 'Settings',     icon: 'ti-settings-2',       section: 'system' },
];

export const WEEKLY_CHART_DATA: ChartDataPoint[] = [];