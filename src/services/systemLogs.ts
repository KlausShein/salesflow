import { supabase } from '../lib/supabase';

// ─── System Logs ─────────────────────────────────────────────
// Stored in Supabase system_logs table, isolated by tenant_id

export type LogType = 'sale' | 'expense' | 'auth' | 'settings' | 'delete';

export interface LogEntry {
  id:        string;
  timestamp: string;
  user:      string;
  action:    string;
  details:   string;
  type:      LogType;
}

const getCurrentTenantId = (): string | null => {
  try {
    const stored = localStorage.getItem('printpos_active_tenant');
    return stored ? JSON.parse(stored)?.tenantId ?? null : null;
  } catch { return null; }
};

const getCurrentUser = (): string => {
  try {
    const stored = localStorage.getItem('printpos_active_user');
    return stored ? JSON.parse(stored)?.name ?? 'Unknown' : 'System';
  } catch { return 'System'; }
};

export const addSystemLog = async (
  action:  string,
  details: string,
  type:    LogType,
  user?:   string,
): Promise<void> => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return; // no tenant context yet — skip silently

    await supabase.from('system_logs').insert({
      tenant_id:  tenantId,
      user_name:  user ?? getCurrentUser(),
      action,
      details,
      type,
      timestamp:  new Date().toISOString(),
    });
  } catch {
    /* silently ignore log errors — never break the main flow */
  }
};

export const getSystemLogs = async (tenantId: string): Promise<LogEntry[]> => {
  try {
    const { data, error } = await supabase
      .from('system_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('timestamp', { ascending: false })
      .limit(500);

    if (error) throw error;

    return (data ?? []).map(r => ({
      id:        r.id,
      timestamp: r.timestamp,
      user:      r.user_name ?? 'Unknown',
      action:    r.action,
      details:   r.details ?? '',
      type:      r.type as LogType,
    }));
  } catch {
    return [];
  }
};

export const clearSystemLogs = async (tenantId: string): Promise<void> => {
  try {
    await supabase
      .from('system_logs')
      .delete()
      .eq('tenant_id', tenantId);
  } catch {
    /* silently ignore */
  }
};