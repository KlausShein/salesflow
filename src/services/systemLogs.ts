// ─── System Logs ─────────────────────────────────────────────
// Stored in localStorage under 'printpos_system_logs'
// Max 500 entries kept

export type LogType = 'sale' | 'expense' | 'auth' | 'settings' | 'delete';

export interface LogEntry {
  id:        string;
  timestamp: string;
  user:      string;
  action:    string;
  details:   string;
  type:      LogType;
}

const LOG_KEY     = 'printpos_system_logs';
const MAX_ENTRIES = 500;

const getCurrentUser = (): string => {
  try {
    const stored = localStorage.getItem('printpos_active_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.name ?? 'Unknown';
    }
  } catch { /* ignore */ }
  return 'System';
};

export const addSystemLog = (
  action:  string,
  details: string,
  type:    LogType,
  user?:   string,
): void => {
  try {
    const logs: LogEntry[] = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]');
    logs.unshift({
      id:        crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user:      user ?? getCurrentUser(),
      action,
      details,
      type,
    });
    localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, MAX_ENTRIES)));
  } catch { /* silently ignore storage errors */ }
};

export const getSystemLogs = (): LogEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]');
  } catch {
    return [];
  }
};

export const clearSystemLogs = (): void => {
  localStorage.removeItem(LOG_KEY);
};