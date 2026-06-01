import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { addSystemLog } from '../services/systemLogs';

export type UserRole = 'admin' | 'cashier' | 'manager';

export interface ActiveUser {
  id:       string;
  name:     string;
  username: string;
  role:     UserRole;
  initials: string;
  ownerId?: string;
}

interface AuthContextType {
  ownerSession: Session | null;
  ownerLoading: boolean;
  activeUser:   ActiveUser | null;

  ownerLogin:  (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  ownerSignUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  ownerLogout: () => Promise<void>;
  staffLogin:  (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  staffLogout: () => void;

  isAuthenticated: boolean;

  user:   ActiveUser | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const STAFF_KEY = 'printpos_active_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ownerSession, setOwnerSession] = useState<Session | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(true);
  const [activeUser,   setActiveUser]   = useState<ActiveUser | null>(null);

  // Load staff session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STAFF_KEY);
    if (stored) {
      try { setActiveUser(JSON.parse(stored)); }
      catch { localStorage.removeItem(STAFF_KEY); }
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
          localStorage.removeItem(STAFF_KEY);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const ownerSignUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { success: false, error: error.message };
    addSystemLog('Account Created', `New business account: ${email}`, 'auth');
    return { success: true };
  };

  const ownerLogin = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };

    const adminUser: ActiveUser = {
      id:       data.user.id,
      name:     'Admin',
      username: email,
      role:     'admin',
      initials: 'AD',
      ownerId:  data.user.id,
    };
    setActiveUser(adminUser);
    localStorage.setItem(STAFF_KEY, JSON.stringify(adminUser));

    addSystemLog('Admin Login', `Signed in as ${email}`, 'auth', 'Admin');

    return { success: true };
  };

  const ownerLogout = async () => {
    addSystemLog('Admin Logout', 'Admin signed out', 'auth', 'Admin');
    await supabase.auth.signOut();
    setActiveUser(null);
    localStorage.removeItem(STAFF_KEY);
  };

  const staffLogin = async (username: string, password: string) => {
    const { data, error } = await supabase
      .rpc('staff_login', {
        p_username: username.trim().toLowerCase(),
        p_password: password,
      });

    console.log('RPC data[0]:', data?.[0]);
    console.log('RPC error:',   error);

    if (error || !data || data.length === 0) {
      addSystemLog('Failed Login', `Invalid credentials for: ${username}`, 'auth', username);
      return { success: false, error: 'Invalid username or password.' };
    }

    const found = data[0];

    if (!found?.owner_id) {
      console.error('staff_login: owner_id missing from RPC result', found);
      return { success: false, error: 'Login failed. Please contact your admin.' };
    }

    const staffUser: ActiveUser = {
      id:       found.id,
      name:     found.name,
      username: found.username ?? username,
      role:     found.role   as UserRole,
      initials: found.initials ?? '',
      ownerId:  found.owner_id,
    };

    setActiveUser(staffUser);
    localStorage.setItem(STAFF_KEY, JSON.stringify(staffUser));

    addSystemLog(
      'Staff Login',
      `${found.name} (${found.role}) signed in`,
      'auth',
      found.name
    );

    return { success: true };
  };

  const staffLogout = () => {
    if (!ownerSession) return;

    addSystemLog('Staff Logout', `${activeUser?.name ?? 'Staff'} signed out`, 'auth', activeUser?.name);

    const adminUser: ActiveUser = {
      id:       ownerSession.user.id,
      name:     'Admin',
      username: ownerSession.user.email ?? '',
      role:     'admin',
      initials: 'AD',
      ownerId:  ownerSession.user.id,
    };
    setActiveUser(adminUser);
    localStorage.setItem(STAFF_KEY, JSON.stringify(adminUser));
  };

  return (
    <AuthContext.Provider value={{
      ownerSession,
      ownerLoading,
      activeUser,
      ownerLogin,
      ownerSignUp,
      ownerLogout,
      staffLogin,
      staffLogout,
      isAuthenticated: !!activeUser,
      user:   activeUser,
      logout: ownerLogout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}