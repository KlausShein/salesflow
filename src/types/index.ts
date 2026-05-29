// ── Core Types ────────────────────────────────────────────

export interface Transaction {
  id:          string;
  date:        string;
  displayDate: string;
  amount:      number;
  notes:       string;
  status:      'Pending' | 'Completed' | 'Failed';
  type?:       'SALE' | 'EXPENSE';
  description?: string;
  time?:       string;
  user?:       string;
}

export interface SalesRecord {
  id:          string;
  date:        string;
  displayDate: string;
  amount:      number;
  distributed: number;
  notes:       string;
  status:      'Completed' | 'Pending';
}

export interface ExpenseRecord {
  id:          string;
  date:        string;
  displayDate: string;
  category:    string;
  amount:      number;
  notes?:      string;
  description?: string;
  addedBy?:    string;
  status?:     'Completed' | 'Pending';
}

export type ExpenseCategory = string;

export interface DistributionCategory {
  id:          string;
  name:        string;
  icon?:       string;
  amount?:     number;
  percentage?: number;
  color?:      string;
  bgColor?:    string;
}

export interface DistributionResult extends DistributionCategory {
  date?:   string;
  status?: 'Distributed' | 'Pending';
}

export interface Customer {
  id:             string;
  name:           string;
  email?:         string;
  phone?:         string;
  totalPurchases: number;
  lastPurchase?:  string;
}

export type SystemUserRole = 'Admin' | 'Manager' | 'Cashier' | 'Staff';

export interface SystemUser {
  id:        string;
  name:      string;
  email:     string;
  role:      SystemUserRole;
  status:    'Active' | 'Inactive';
  initials?: string;
  username?: string;
  password?: string;
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

export interface BusinessSettings {
  businessName: string;
  owner?:       string;
  address?:     string;
  phone?:       string;
  email?:       string;
  currency?:    string;
  timezone?:    string;
  locale?:      string;
}

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

export interface SaleItem {
  serviceId:   string;
  serviceName: string;
  qty:         number;
  unitPrice:   number;
  total:       number;
}

// ── Inventory ─────────────────────────────────────────────
export interface InventoryItem {
  id:         string;
  name:       string;
  category:   string;
  stock:       number;      // ← used as it.stock in InventoryPage
  unit:        string;
  unitCost:    number;      // ← used as it.unitCost
  totalValue:  number;      // ← used as it.totalValue
  status:      'In Stock' | 'Low Stock' | 'Out of Stock';
}

// ── Services ──────────────────────────────────────────────
export interface Service {
  id:         string;
  name:       string;
  unit:        string;
  unitPrice:   number;      // ← used as s.unitPrice in ServicesPage
  category:    string;
  isActive:    boolean;     // ← used as s.isActive
  description?: string;
}