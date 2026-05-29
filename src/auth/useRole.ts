import { useAuth } from './AuthContext';
import { Permission, SystemUserRole } from '../types';
import { getPermissions, hasPermission } from './permissions';

export const useRole = () => {
  const { activeUser } = useAuth();

  // Map AuthContext role strings to SystemUserRole
  const rawRole = activeUser?.role ?? 'Staff';
  const roleMap: Record<string, SystemUserRole> = {
    admin:   'Admin',
    manager: 'Manager',
    cashier: 'Cashier',
    staff:   'Staff',
    // already capitalized versions pass through
    Admin:   'Admin',
    Manager: 'Manager',
    Cashier: 'Cashier',
    Staff:   'Staff',
  };
  const role: SystemUserRole = roleMap[rawRole] ?? 'Staff';
  const permissions = getPermissions(role);

  const can = (permission: keyof Permission): boolean =>
    hasPermission(role, permission);

  return { role, permissions, can };
};