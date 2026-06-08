// ── Core Types ────────────────────────────────────────────

export interface Transaction {
  id:           string;
  date:         string;
  displayDate:  string;
  amount:       number;
  notes:        string;
  status:       'Pending' | 'Completed' | 'Failed';
  type?:        'SALE' | 'EXPENSE';
  description?: string;
  time?:        string;
  user?:        string;
}

// ── MULTI-TENANT: SalesRecord ─────────────────────────────
export interface SalesRecord {
  id:          string;
  tenantId?:   string;   // optional — db.ts injects it automatically
  date:        string;
  displayDate: string;
  amount:      number;
  distributed: number;
  notes:       string;
  status:      'Completed' | 'Pending';
}

// ── MULTI-TENANT: ExpenseRecord ───────────────────────────
export interface ExpenseRecord {
  id:          string;
  tenantId?:   string;   // optional — db.ts injects it automatically
  date:        string;
  displayDate: string;
  category:    string;
  description: string;
  amount:      number;
  addedBy?:    string;
  status?:     'Completed' | 'Pending';  // optional — defaults to 'Completed'
}

export type ExpenseCategory = string;

// ── MULTI-TENANT: DistributionCategory ────────────────────
export interface DistributionCategory {
  id:          string;
  tenantId?:   string;
  name:        string;
  percentage:  number;
  amount?:     number;
  color:       string;
  bgColor:     string;
  icon?:       string;
}

export interface DistributionResult extends DistributionCategory {
  date?:   string;
  status?: 'Distributed' | 'Pending';
}

// ── MULTI-TENANT: Customer ────────────────────────────────
export interface Customer {
  id:             string;
  tenantId?:      string;   // optional — db.ts injects it automatically
  name:           string;
  email?:         string;
  phone?:         string;
  totalPurchases: number;
  lastPurchase?:  string;
}

// ── Users (Global) ─────────────────────────────────────────
export type SystemUserRole = 'Admin' | 'Manager' | 'Cashier' | 'Staff';

export interface SystemUser {
  id:        string;
  name:      string;
  email:     string;
  username:  string;
  password?: string;
  role:      SystemUserRole;
  status:    'Active' | 'Inactive';
  initials?: string;
}

// ── MULTI-TENANT: Tenant & User-Business Relationship ─────
export interface Tenant {
  id:           string;
  businessName: string;
  ownerId:      string;
  createdAt:    string;
  status:       'active' | 'suspended' | 'deleted';
}

export interface UserBusinessRole {
  id:           string;
  tenantId:     string;
  userId:       string;
  role:         SystemUserRole;
  permissions?: Record<string, boolean>;
  createdAt:    string;
}

// ── Permissions ───────────────────────────────────────────
export interface Permission {
  canViewDashboard:    boolean;
  canViewSales:        boolean;
  canAddSales:         boolean;
  canDeleteSales:      boolean;
  canViewExpenses:     boolean;
  canAddExpenses:      boolean;
  canDeleteExpenses:   boolean;
  canViewReports:      boolean;
  canViewDistribution: boolean;
  canViewCustomers:    boolean;
  canAddCustomers:     boolean;
  canViewUsers:        boolean;
  canManageUsers:      boolean;
  canViewSettings:     boolean;
  canEditSettings:     boolean;
}

// ── Business Settings ─────────────────────────────────────
export interface BusinessSettings {
  tenantId?:      string;   // optional — db.ts injects it automatically
  businessName:   string;
  owner?:         string;
  address?:       string;
  phone?:         string;
  email?:         string;
  currency?:      string;
  timezone?:      string;
  locale?:        string;
  theme?:         'light' | 'dark' | 'system';
  language?:      string;
  receiptPrefix?: string;
  footerText?:    string;
}

// ── Dashboard Stats ───────────────────────────────────────
export interface DashboardStats {
  totalSales?:          number;
  totalExpenses?:       number;
  netProfit?:           number;
  totalSalesToday?:     number;
  totalExpensesToday?:  number;
  netIncomeToday?:      number;
  remainingBalance?:    number;
  lastTransactionDate?: string;
  salesChangePct?:      number;
  expensesChangePct?:   number;
  netChangePct?:        number;
}

// ── Navigation ─────────────────────────────────────────────
export interface NavItem {
  id:       string;
  label:    string;
  icon?:    string;
  href?:    string;
  section?: string;
  badge?:   number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

// ── Sales Item ─────────────────────────────────────────────
export interface SaleItem {
  serviceId:   string;
  serviceName: string;
  qty:         number;
  unitPrice:   number;
  total:       number;
}

// ── Inventory ──────────────────────────────────────────────
export interface InventoryItem {
  id:         string;
  tenantId?:  string;   // optional — db.ts injects it automatically
  name:       string;
  category:   string;
  stock:      number;
  unit:       string;
  unitCost:   number;
  totalValue: number;
  status:     'In Stock' | 'Low Stock' | 'Out of Stock';
}

// ── Services ───────────────────────────────────────────────
export interface Service {
  id:           string;
  tenantId?:    string;   // optional — db.ts injects it automatically
  name:         string;
  unit:         string;
  unitPrice:    number;
  category:     string;
  isActive:     boolean;
  description?: string;
}

// ── Working Days Configuration ─────────────────────────────
export interface WorkingDaysConfig {
  monday:              boolean;
  tuesday:             boolean;
  wednesday:           boolean;
  thursday:            boolean;
  friday:              boolean;
  saturday:            boolean;
  sunday:              boolean;
  workingDaysPerMonth: number;
}

export const DEFAULT_WORKING_DAYS: WorkingDaysConfig = {
  monday:              true,
  tuesday:             true,
  wednesday:           true,
  thursday:            true,
  friday:              true,
  saturday:            false,
  sunday:              false,
  workingDaysPerMonth: 22,
};

// ── Financial Projections ─────────────────────────────────
export interface FinancialProjection {
  // Target metrics
  breakEvenSales:            number;
  dailySalesTarget:          number;
  projectedMonthly:          number;
  totalMonthlyOperatingCost: number;
  profitMarginTarget:        number;
  workingDaysPerMonth:       number;
  // Actual metrics (based on real sales)
  totalActualSales:          number;
  totalDistributedAmount:    number;
  actualProfitAmount:        number;
  actualProfitMargin:        number;
}

// ── System Logs ────────────────────────────────────────────
export interface SystemLog {
  id:        string;
  tenantId?: string;   // optional
  timestamp: string;
  user:      string;
  action:    string;
  details:   string;
  type:      'sale' | 'expense' | 'auth' | 'settings' | 'delete';
}

// ── Payment Methods ───────────────────────────────────────
export interface PaymentMethod {
  id:              string;
  tenantId?:       string;   // optional
  type:            'cash' | 'card' | 'gcash' | 'paypal' | 'bank_transfer';
  name:            string;
  isActive:        boolean;
  accountDetails?: string;
  commission?:     number;
}

// ── Backup Records ────────────────────────────────────────
export interface BackupRecord {
  id:         string;
  tenantId?:  string;   // optional
  fileName:   string;
  backupSize: number;
  status:     'completed' | 'in-progress' | 'failed';
  createdAt:  string;
}