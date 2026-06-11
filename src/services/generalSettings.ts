// ─── General Settings Service ─────────────────────────────────

export interface GeneralSettings {
  theme:             'light' | 'dark' | 'system';
  language:          'en' | 'fil';
  currency:          'PHP' | 'USD';
  timezone:          string;
  notifSale:         boolean;
  notifExpense:      boolean;
  notifLowBalance:   boolean;
  notifDailySummary: boolean;
}

export const DEFAULT_GENERAL: GeneralSettings = {
  theme:             'light',
  language:          'en',
  currency:          'PHP',
  timezone:          'Asia/Manila',
  notifSale:         true,
  notifExpense:      true,
  notifLowBalance:   false,
  notifDailySummary: false,
};

const KEY = 'printpos_general_settings';

export const loadGeneralSettings = (): GeneralSettings => {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return { ...DEFAULT_GENERAL, ...JSON.parse(s) };
  } catch { /* ignore */ }
  return DEFAULT_GENERAL;
};

export const saveGeneralSettings = (s: GeneralSettings): void => {
  localStorage.setItem(KEY, JSON.stringify(s));
};

export const applyTheme = (theme: GeneralSettings['theme']): void => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else if (theme === 'system') {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', 'light');
  }
};

export const getCurrencySymbol = (): string => {
  return loadGeneralSettings().currency === 'USD' ? '$' : '₱';
};

export const showNotification = async (
  title: string,
  body:  string,
  type:  keyof Pick<GeneralSettings, 'notifSale' | 'notifExpense' | 'notifLowBalance' | 'notifDailySummary'>
): Promise<void> => {
  try {
    const s = loadGeneralSettings();
    if (!s[type]) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  } catch { /* ignore */ }
};

export const initGeneralSettings = (): void => {
  const s = loadGeneralSettings();
  applyTheme(s.theme);
  if (s.theme === 'system') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    });
  }
};