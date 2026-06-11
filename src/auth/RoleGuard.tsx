import React from 'react';
import { Permission } from '../types';
import { useRole } from './useRole';

interface RoleGuardProps {
  permission: keyof Permission;
  children:   React.ReactNode;
  fallback?:  React.ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const { can } = useRole();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
};

export default RoleGuard;