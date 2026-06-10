import { Permission, SystemUserRole } from '../types';

export const ROLE_PERMISSIONS: Record<SystemUserRole, Permission> = {
  Admin: {
    canViewDashboard:    true,
    canViewSales:        true,
    canAddSales:         true,
    canDeleteSales:      true,
    canViewExpenses:     true,
    canAddExpenses:      true,
    canDeleteExpenses:   true,
    canViewReports:      true,
    canViewDistribution: true,
    canViewCustomers:    true,
    canAddCustomers:     true,
    canViewUsers:        true,
    canManageUsers:      true,
    canViewSettings:     true,
    canEditSettings:     true,
  },
  Manager: {
    canViewDashboard:    true,
    canViewSales:        true,
    canAddSales:         true,   // ← Managers can add sales
    canDeleteSales:      false,
    canViewExpenses:     true,
    canAddExpenses:      true,   // ← Managers can add expenses
    canDeleteExpenses:   false,
    canViewReports:      true,
    canViewDistribution: true,
    canViewCustomers:    true,
    canAddCustomers:     true,
    canViewUsers:        true,
    canManageUsers:      false,
    canViewSettings:     true,
    canEditSettings:     false,
  },
  Cashier: {
    canViewDashboard:    true,
    canViewSales:        true,
    canAddSales:         true,   // ← Can add sales
    canDeleteSales:      false,
    canViewExpenses:     true,   // ← Can view expenses
    canAddExpenses:      true,   // ← Can add expenses
    canDeleteExpenses:   false,
    canViewReports:      false,
    canViewDistribution: false,
    canViewCustomers:    true,
    canAddCustomers:     true,
    canViewUsers:        false,
    canManageUsers:      false,
    canViewSettings:     false,
    canEditSettings:     false,
  },
  Staff: {
    canViewDashboard:    true,
    canViewSales:        true,
    canAddSales:         true,   // ← FIXED: Staff can now add sales
    canDeleteSales:      false,  // ← Cannot delete
    canViewExpenses:     false,
    canAddExpenses:      false,
    canDeleteExpenses:   false,
    canViewReports:      false,
    canViewDistribution: false,
    canViewCustomers:    true,
    canAddCustomers:     false,
    canViewUsers:        false,
    canManageUsers:      false,
    canViewSettings:     false,
    canEditSettings:     false,
  },
};

export const getPermissions = (role: SystemUserRole): Permission =>
  ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS['Staff'];

export const hasPermission = (
  role: SystemUserRole,
  permission: keyof Permission
): boolean => ROLE_PERMISSIONS[role]?.[permission] ?? false;