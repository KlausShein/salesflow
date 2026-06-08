import { useState, useEffect, useCallback } from 'react';
import {
  SalesRecord,
  ExpenseRecord,
  Customer,
  SystemUser,
  BusinessSettings,
  DistributionCategory,
} from '../types';
import {
  fetchSales,         upsertSale,
  deleteSale,         deleteAllSales,
  fetchExpenses,      insertExpense,      deleteExpense,
  fetchCustomers,     insertCustomer,
  fetchSystemUsers,   insertSystemUser,   toggleUserStatus,
  fetchSettings,      saveSettings,
  fetchDistribution,  saveDistribution,
} from '../services/db';
import { isoToDisplay }          from '../utils/helpers';
import { BUSINESS_SETTINGS,
         DISTRIBUTION_CATEGORIES } from '../data/seed';

const isValidUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const isReady = (tenantId: string | null): tenantId is string =>
  !!tenantId && isValidUUID(tenantId);

// ─── Sales ──────────────────────────────────────────────────
export const useSupaSales = (tenantId: string | null) => {
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!isReady(tenantId)) { setLoading(false); return; }
    setLoading(true);
    fetchSales()
      .then(setRecords)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const addOrUpdateSale = useCallback(
    async (date: string, amount: number, notes: string) => {
      const display = isoToDisplay(date);
      const record  = await upsertSale(date, amount, notes, display);
      setRecords(prev => {
        const idx = prev.findIndex(r => r.date === date);
        if (idx >= 0) {
          const next = [...prev];
          next[idx]  = record;
          return next;
        }
        return [record, ...prev];
      });
    },
    []
  );

  const removeSale = useCallback(async (id: string) => {
    await deleteSale(id);
    setRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  const removeAllSales = useCallback(async () => {
    await deleteAllSales();
    setRecords([]);
  }, []);

  return { records, loading, error, addOrUpdateSale, removeSale, removeAllSales };
};

// ─── Expenses ────────────────────────────────────────────────
export const useSupaExpenses = (tenantId: string | null) => {
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!isReady(tenantId)) { setLoading(false); return; }
    setLoading(true);
    fetchExpenses()
      .then(setRecords)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const addExpense = useCallback(async (expense: Omit<ExpenseRecord, 'id'>) => {
    const record = await insertExpense(expense);
    setRecords(prev => [record, ...prev]);
  }, []);

  const removeExpense = useCallback(async (id: string) => {
    await deleteExpense(id);
    setRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  return { records, loading, error, addExpense, removeExpense };
};

// ─── Customers ───────────────────────────────────────────────
export const useSupaCustomers = (tenantId: string | null) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!isReady(tenantId)) { setLoading(false); return; }
    setLoading(true);
    fetchCustomers()
      .then(setCustomers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tenantId]);

  const addCustomer = useCallback(async (c: Omit<Customer, 'id'>) => {
    const record = await insertCustomer(c);
    setCustomers(prev => [record, ...prev]);
  }, []);

  return { customers, loading, addCustomer };
};

// ─── System Users ────────────────────────────────────────────
export const useSupaUsers = (tenantId: string | null) => {
  const [users,   setUsers]   = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady(tenantId)) { setLoading(false); return; }
    setLoading(true);
    fetchSystemUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tenantId]);

  const addUser = useCallback(async (u: Omit<SystemUser, 'id'>) => {
    const record = await insertSystemUser(u);
    setUsers(prev => [record, ...prev]);
  }, []);

  const toggleStatus = useCallback(async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    const next: 'Active' | 'Inactive' =
      user.status === 'Active' ? 'Inactive' : 'Active';
    await toggleUserStatus(id, user.status);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: next } : u));
  }, [users]);

  return { users, loading, addUser, toggleStatus };
};

// ─── Settings ────────────────────────────────────────────────
export const useSupaSettings = (tenantId: string | null) => {
  const [settings, setSettings] = useState<BusinessSettings>(BUSINESS_SETTINGS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (!isReady(tenantId)) { setLoading(false); return; }
    setLoading(true);
    fetchSettings()
      .then(setSettings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tenantId]);

  const updateSettings = useCallback(async (s: BusinessSettings) => {
    setSaving(true);
    await saveSettings(s);
    setSettings(s);
    setSaving(false);
  }, []);

  return { settings, loading, saving, updateSettings };
};

// ─── Distribution Categories ──────────────────────────────────
export const useSupaDistribution = (tenantId: string | null) => {
  const [categories, setCategories] = useState<DistributionCategory[]>(
    DISTRIBUTION_CATEGORIES
  );
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (!isReady(tenantId)) { setLoading(false); return; }
    setLoading(true);
    fetchDistribution()
      .then(data => {
        if (data && data.length > 0) setCategories(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tenantId]);

  const updateCategories = useCallback(async (next: DistributionCategory[]) => {
    setSaving(true);
    await saveDistribution(next);
    setCategories(next);
    setSaving(false);
  }, []);

  return { categories, loading, saving, updateCategories };
};