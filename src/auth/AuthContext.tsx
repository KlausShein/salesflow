import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { addSystemLog } from '../services/systemLogs';

export type UserRole = 'admin' | 'manager' | 'cashier' | 'staff';

export interface ActiveUser {
  id:        string;
  name:      string;
  username:  string;
  role:      UserRole;
  initials:  string;
  tenantId:  string;
  ownerId?:  string;
}

interface AuthContextType {
  ownerSession:    Session | null;
  ownerLoading:    boolean;
  activeUser:      ActiveUser | null;
  currentTenantId: string | null;

  ownerLogin:   (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  ownerSignUp:  (email: string, password: string, businessName?: string) => Promise<{ success: boolean; error?: string }>;
  ownerLogout:  () => Promise<void>;
  createTenant: (businessName: string) => Promise<{ success: boolean; tenantId?: string; error?: string }>;
  staffLogin:   (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  staffLogout:  () => void;
  switchTenant: (tenantId: string) => void;

  isAuthenticated: boolean;
  user:            ActiveUser | null;
  logout:          () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const STAFF_KEY  = 'printpos_active_user';
const TENANT_KEY = 'printpos_active_tenant';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ownerSession,    setOwnerSession]    = useState<Session | null>(null);
  const [ownerLoading,    setOwnerLoading]    = useState(true);
  const [activeUser,      setActiveUser]      = useState<ActiveUser | null>(null);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);

  useEffect(() => {
    const storedUser   = localStorage.getItem(STAFF_KEY);
    const storedTenant = localStorage.getItem(TENANT_KEY);

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setActiveUser(user);
        setCurrentTenantId(user.tenantId);
      } catch {
        localStorage.removeItem(STAFF_KEY);
      }
    }

    if (storedTenant) {
      try {
        const { tenantId } = JSON.parse(storedTenant);
        setCurrentTenantId(tenantId);
      } catch {
        localStorage.removeItem(TENANT_KEY);
      }
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setOwnerSession(session);
      setOwnerLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setOwnerSession(session);
        setOwnerLoading(false);
        if (event === 'SIGNED_OUT') {
          setActiveUser(null);
          setCurrentTenantId(null);
          localStorage.removeItem(STAFF_KEY);
          localStorage.removeItem(TENANT_KEY);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Admin: Sign up + auto-create tenant ──
  const ownerSignUp = async (
    email:        string,
    password:     string,
    businessName: string = 'My Business'
  ) => {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) return { success: false, error: signUpError.message };
    if (!signUpData.user) return { success: false, error: 'Sign up failed.' };

    const userId  = signUpData.user.id;
    const session = signUpData.session;

    if (!session) {
      return { success: true };
    }

    await setupOwnerTenant(userId, email, businessName, session.access_token);
    addSystemLog('Account Created', `New business account: ${email}`, 'auth');
    return { success: true };
  };

  // ── Helper: create tenant + system_user + role + settings ──
  const setupOwnerTenant = async (
    userId:       string,
    email:        string,
    businessName: string,
    accessToken:  string
  ) => {
    const headers = {
      'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    };
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;

    const tenantRes = await fetch(`${baseUrl}/rest/v1/tenants`, {
      method: 'POST', headers,
      body: JSON.stringify({ owner_id: userId, business_name: businessName, status: 'active' }),
    });
    if (!tenantRes.ok) throw new Error('Failed to create tenant');
    const [tenant] = await tenantRes.json();

    const userRes = await fetch(`${baseUrl}/rest/v1/system_users`, {
      method: 'POST', headers,
      body: JSON.stringify({
        id: userId, name: 'Admin', email,
        role: 'Admin', status: 'Active',
        username: email.split('@')[0], initials: 'AD',
      }),
    });
    if (!userRes.ok) throw new Error('Failed to create system user');

    const roleRes = await fetch(`${baseUrl}/rest/v1/user_business_roles`, {
      method: 'POST', headers,
      body: JSON.stringify({ tenant_id: tenant.id, user_id: userId, role: 'Admin' }),
    });
    if (!roleRes.ok) throw new Error('Failed to assign admin role');

    await fetch(`${baseUrl}/rest/v1/business_settings`, {
      method: 'POST', headers,
      body: JSON.stringify({
        tenant_id: tenant.id, business_name: businessName,
        owner: '', address: '', phone: '', email,
      }),
    });

    return tenant.id;
  };

  // ── Admin: Log in ──
  const ownerLogin = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };

    const userId      = data.user.id;
    const accessToken = data.session.access_token;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tenants?select=id&owner_id=eq.${userId}&limit=1`,
      {
        headers: {
          'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Tenant fetch failed:', response.status, await response.text());
      return { success: false, error: 'No tenant found for this admin account' };
    }

    const tenants = await response.json();

    let tenantId: string;
    if (!tenants || tenants.length === 0) {
      try {
        tenantId = await setupOwnerTenant(userId, email, 'My Business', accessToken);
      } catch {
        return { success: false, error: 'Failed to set up your business account' };
      }
    } else {
      tenantId = tenants[0].id;
    }

    const adminUser: ActiveUser = {
      id: userId, name: 'Admin', username: email,
      role: 'admin', initials: 'AD', tenantId, ownerId: userId,
    };

    setActiveUser(adminUser);
    setCurrentTenantId(tenantId);
    localStorage.setItem(STAFF_KEY,  JSON.stringify(adminUser));
    localStorage.setItem(TENANT_KEY, JSON.stringify({ tenantId }));

    addSystemLog('Admin Login', `Signed in as ${email}`, 'auth');
    return { success: true };
  };

  // ── Admin: Log out ──
  const ownerLogout = async () => {
    addSystemLog('Admin Logout', 'Admin signed out', 'auth');
    await supabase.auth.signOut();
    setActiveUser(null);
    setCurrentTenantId(null);
    localStorage.removeItem(STAFF_KEY);
    localStorage.removeItem(TENANT_KEY);
  };

  // ── Admin: Create additional tenant ──
  const createTenant = async (businessName: string) => {
    if (!ownerSession?.user.id) return { success: false, error: 'Not authenticated' };
    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert({ business_name: businessName, owner_id: ownerSession.user.id, status: 'active' })
        .select('id').single();
      if (error) throw error;

      await supabase.from('user_business_roles').insert({
        tenant_id: data.id, user_id: ownerSession.user.id, role: 'Admin',
      });

      // Also create default business_settings for new tenant
      await supabase.from('business_settings').insert({
        tenant_id: data.id, business_name: businessName,
        owner: '', address: '', phone: '', email: ownerSession.user.email ?? '',
      });

      addSystemLog('Tenant Created', `Business: ${businessName}`, 'settings');
      return { success: true, tenantId: data.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create business' };
    }
  };

  // ── Switch tenant ──
  const switchTenant = (tenantId: string) => {
    setCurrentTenantId(tenantId);
    localStorage.setItem(TENANT_KEY, JSON.stringify({ tenantId }));
    if (activeUser) {
      const updated = { ...activeUser, tenantId };
      setActiveUser(updated);
      localStorage.setItem(STAFF_KEY, JSON.stringify(updated));
    }
  };

  // ── Staff: Log in ──
  const staffLogin = async (username: string, password: string) => {
    const { data, error } = await supabase.rpc('staff_login', {
      p_username: username.trim().toLowerCase(),
      p_password: password,
    });

    console.log('staff_login RPC result:', { data, error });

    if (error) {
      console.error('staff_login error:', error);
      addSystemLog('Failed Login', `Invalid credentials for: ${username}`, 'auth');
      return { success: false, error: 'Invalid username or password.' };
    }

    // RPC returns array of rows
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      addSystemLog('Failed Login', `Invalid credentials for: ${username}`, 'auth');
      return { success: false, error: 'Invalid username or password.' };
    }

    const found = rows[0];
    console.log('Found staff user:', found);

    if (!found?.id) {
      return { success: false, error: 'Login failed — user data incomplete.' };
    }

    // Get tenant for this staff member
    const { data: roleData, error: roleError } = await supabase
      .from('user_business_roles')
      .select('tenant_id')
      .eq('user_id', found.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    console.log('Role data:', { roleData, roleError });

    if (!roleData?.tenant_id) {
      return { success: false, error: 'User has no assigned tenant' };
    }

    const staffUser: ActiveUser = {
      id:       found.id,
      name:     found.name,
      username: found.username ?? username,
      role:     (found.role?.toLowerCase() ?? 'staff') as UserRole,
      initials: found.initials ?? '',
      tenantId: roleData.tenant_id,
    };

    setActiveUser(staffUser);
    setCurrentTenantId(roleData.tenant_id);
    localStorage.setItem(STAFF_KEY,  JSON.stringify(staffUser));
    localStorage.setItem(TENANT_KEY, JSON.stringify({ tenantId: roleData.tenant_id }));

    addSystemLog('Staff Login', `${found.name} (${found.role}) signed in`, 'auth');
    return { success: true };
  };

  // ── Staff: Log out ──
  const staffLogout = () => {
    if (!ownerSession) return;
    addSystemLog('Staff Logout', `${activeUser?.name ?? 'Staff'} signed out`, 'auth');

    const adminUser: ActiveUser = {
      id:       ownerSession.user.id,
      name:     'Admin',
      username: ownerSession.user.email ?? '',
      role:     'admin',
      initials: 'AD',
      tenantId: currentTenantId ?? '',
      ownerId:  ownerSession.user.id,
    };

    setActiveUser(adminUser);
    localStorage.setItem(STAFF_KEY, JSON.stringify(adminUser));
  };

  return (
    <AuthContext.Provider
      value={{
        ownerSession, ownerLoading, activeUser, currentTenantId,
        ownerLogin, ownerSignUp, ownerLogout, createTenant,
        staffLogin, staffLogout, switchTenant,
        isAuthenticated: !!activeUser,
        user:            activeUser,
        logout:          ownerLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}