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

const clearLocalAuth = () => {
  localStorage.removeItem(STAFF_KEY);
  localStorage.removeItem(TENANT_KEY);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ownerSession,    setOwnerSession]    = useState<Session | null>(null);
  const [ownerLoading,    setOwnerLoading]    = useState(true);
  const [activeUser,      setActiveUser]      = useState<ActiveUser | null>(null);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);

  // ── Restore session from localStorage on mount ─────────────
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

  // ── Monitor Supabase auth state ────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Stale/invalid refresh token — force re-login
        console.warn('Stale session detected:', error.message);
        supabase.auth.signOut();
        setActiveUser(null);
        setCurrentTenantId(null);
        clearLocalAuth();
      }
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
          clearLocalAuth();
        }

        if (event === 'TOKEN_REFRESHED' && !session) {
          supabase.auth.signOut();
          setActiveUser(null);
          setCurrentTenantId(null);
          clearLocalAuth();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Admin: Sign Up ─────────────────────────────────────────
  // Creates auth user + tenant + system_user + settings in one flow.
  // This is the ONLY place a tenant gets created for an owner.
  const ownerSignUp = async (
    email:        string,
    password:     string,
    businessName: string = 'My Business'
  ) => {
    // 1. Create Supabase auth user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError) return { success: false, error: signUpError.message };
    if (!signUpData.user) return { success: false, error: 'Sign up failed.' };

    const userId  = signUpData.user.id;
    const session = signUpData.session;

    // If email confirmation is required, session is null.
    // Tenant will NOT be created yet — it gets created on first login
    // via the setupOwnerTenant call in ownerLogin (only when no tenant exists).
    // We store pending setup info so ownerLogin knows to set up.
    if (!session) {
      return { success: true };
    }

    // 2. Session available immediately — set up tenant now
    try {
      await setupOwnerTenant(userId, email, businessName, session.access_token);
    } catch (err) {
      console.error('Failed to set up tenant during signup:', err);
      // Don't fail signup — user can still log in and tenant will be set up then
    }

    addSystemLog('Account Created', `New business account: ${email}`, 'auth');
    return { success: true };
  };

  // ── Helper: Full tenant setup ──────────────────────────────
  // Creates: tenant + system_user record + user_business_role + business_settings
  // Called ONCE per owner, either at signup or first login.
  const setupOwnerTenant = async (
    userId:       string,
    email:        string,
    businessName: string,
    accessToken:  string
  ): Promise<string> => {
    const headers = {
      'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    };
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;

    // Create tenant
    const tenantRes = await fetch(`${baseUrl}/rest/v1/tenants`, {
      method: 'POST', headers,
      body: JSON.stringify({
        owner_id:      userId,
        business_name: businessName,
        status:        'active',
      }),
    });
    if (!tenantRes.ok) {
      const errText = await tenantRes.text();
      throw new Error(`Failed to create tenant: ${errText}`);
    }
    const [tenant] = await tenantRes.json();

    // Create system_user record for admin
    // Use ON CONFLICT DO NOTHING in case it already exists
    const userRes = await fetch(`${baseUrl}/rest/v1/system_users`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation,resolution=ignore-duplicates' },
      body: JSON.stringify({
        id:       userId,
        name:     'Admin',
        email:    email,
        role:     'Admin',
        status:   'Active',
        username: email.split('@')[0],
        initials: 'AD',
      }),
    });
    if (!userRes.ok) {
      const errText = await userRes.text();
      throw new Error(`Failed to create system user: ${errText}`);
    }

    // Link admin to tenant
    const roleRes = await fetch(`${baseUrl}/rest/v1/user_business_roles`, {
      method: 'POST', headers,
      body: JSON.stringify({
        tenant_id: tenant.id,
        user_id:   userId,
        role:      'Admin',
      }),
    });
    if (!roleRes.ok) {
      const errText = await roleRes.text();
      throw new Error(`Failed to assign admin role: ${errText}`);
    }

    // Create default business settings
    await fetch(`${baseUrl}/rest/v1/business_settings`, {
      method: 'POST', headers,
      body: JSON.stringify({
        tenant_id:     tenant.id,
        business_name: businessName,
        owner:         '',
        address:       '',
        phone:         '',
        email:         email,
      }),
    });

    return tenant.id;
  };

  // ── Admin: Log In ──────────────────────────────────────────
  const ownerLogin = async (email: string, password: string) => {
    // 1. Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };

    const userId      = data.user.id;
    const accessToken = data.session.access_token;

    // 2. Find this owner's tenant using the fresh access token
    //    (bypasses the Supabase client session timing issue)
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
      return { success: false, error: 'Failed to load your business. Please try again.' };
    }

    const tenants = await response.json();

    let tenantId: string;

    if (!tenants || tenants.length === 0) {
      // ── First login after email confirmation ──────────────
      // Tenant wasn't created during signup (email confirmation was required).
      // Set it up now — this only runs ONCE per owner account.
      console.log('No tenant found — setting up business for first time login');
      try {
        tenantId = await setupOwnerTenant(userId, email, 'My Business', accessToken);
      } catch (err) {
        console.error('Tenant setup failed:', err);
        return { success: false, error: 'Failed to set up your business. Please contact support.' };
      }
    } else {
      // ── Normal login — tenant already exists ──────────────
      tenantId = tenants[0].id;
    }

    // 3. Set active user state
    const adminUser: ActiveUser = {
      id:       userId,
      name:     'Admin',
      username: email,
      role:     'admin',
      initials: 'AD',
      tenantId,
      ownerId:  userId,
    };

    setActiveUser(adminUser);
    setCurrentTenantId(tenantId);
    localStorage.setItem(STAFF_KEY,  JSON.stringify(adminUser));
    localStorage.setItem(TENANT_KEY, JSON.stringify({ tenantId }));

    addSystemLog('Admin Login', `Signed in as ${email}`, 'auth');
    return { success: true };
  };

  // ── Admin: Log Out ─────────────────────────────────────────
  const ownerLogout = async () => {
    addSystemLog('Admin Logout', 'Admin signed out', 'auth');
    await supabase.auth.signOut();
    setActiveUser(null);
    setCurrentTenantId(null);
    clearLocalAuth();
  };

  // ── Admin: Create Additional Business (tenant) ─────────────
  // Used when an owner wants to manage multiple business locations.
  // Each call creates a completely isolated new tenant.
  const createTenant = async (businessName: string) => {
    if (!ownerSession?.user.id) {
      return { success: false, error: 'Not authenticated' };
    }
    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert({
          business_name: businessName,
          owner_id:      ownerSession.user.id,
          status:        'active',
        })
        .select('id')
        .single();
      if (error) throw error;

      // Link owner as Admin of the new business
      await supabase.from('user_business_roles').insert({
        tenant_id: data.id,
        user_id:   ownerSession.user.id,
        role:      'Admin',
      });

      // Create default settings for new business
      await supabase.from('business_settings').insert({
        tenant_id:     data.id,
        business_name: businessName,
        owner:         '',
        address:       '',
        phone:         '',
        email:         ownerSession.user.email ?? '',
      });

      addSystemLog('Tenant Created', `Business: ${businessName}`, 'settings');
      return { success: true, tenantId: data.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create business',
      };
    }
  };

  // ── Switch Active Business ─────────────────────────────────
  const switchTenant = (tenantId: string) => {
    setCurrentTenantId(tenantId);
    localStorage.setItem(TENANT_KEY, JSON.stringify({ tenantId }));
    if (activeUser) {
      const updated = { ...activeUser, tenantId };
      setActiveUser(updated);
      localStorage.setItem(STAFF_KEY, JSON.stringify(updated));
    }
  };

  // ── Staff: Log In ──────────────────────────────────────────
  // Uses the staff_login SQL function which returns a JSON object with
  // { id, name, username, role, initials, email, tenant_id }
  const staffLogin = async (username: string, password: string) => {
    const { data, error } = await supabase.rpc('staff_login', {
      p_username: username.trim().toLowerCase(),
      p_password: password,
    });

    console.log('staff_login result:', { data, error });

    // RPC-level failure (network, function missing, etc)
    if (error) {
      console.error('staff_login RPC error:', error);
      addSystemLog('Failed Login', `RPC error for: ${username}`, 'auth');
      return { success: false, error: 'Invalid username or password.' };
    }

    // Business-logic error returned inside JSON
    if (!data || data.error) {
      const msg = data?.error ?? 'Invalid username or password.';
      addSystemLog('Failed Login', `${msg}: ${username}`, 'auth');
      return { success: false, error: msg };
    }

    // Handle both array and single-object responses
    const found = Array.isArray(data) ? data[0] : data;
    console.log('Parsed staff user:', found);

    if (!found?.id) {
      console.error('No id in staff_login response:', found);
      return { success: false, error: 'Login failed — user data incomplete.' };
    }

    if (!found?.tenant_id) {
      return {
        success: false,
        error: 'Your account is not linked to a business. Contact your admin.',
      };
    }

    const staffUser: ActiveUser = {
      id:       String(found.id),
      name:     found.name,
      username: found.username ?? username,
      role:     (found.role?.toLowerCase() ?? 'staff') as UserRole,
      initials: found.initials ?? '',
      tenantId: String(found.tenant_id),
    };

    setActiveUser(staffUser);
    setCurrentTenantId(String(found.tenant_id));
    localStorage.setItem(STAFF_KEY,  JSON.stringify(staffUser));
    localStorage.setItem(TENANT_KEY, JSON.stringify({ tenantId: String(found.tenant_id) }));

    addSystemLog('Staff Login', `${found.name} (${found.role}) signed in`, 'auth');
    return { success: true };
  };

  // ── Staff: Log Out ─────────────────────────────────────────
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
        ownerSession,
        ownerLoading,
        activeUser,
        currentTenantId,
        ownerLogin,
        ownerSignUp,
        ownerLogout,
        createTenant,
        staffLogin,
        staffLogout,
        switchTenant,
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