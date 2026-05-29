import { useState, useEffect, useCallback } from 'react';
import {
  SalesRecord,
  ExpenseRecord,
  Customer,
  SystemUser,
  BusinessSettings,
} from '../types';
import {
  fetchSales,       upsertSale,
  deleteSale,       deleteAllSales,      // ← NEW
  fetchExpenses,    insertExpense,
  fetchCustomers,   insertCustomer,
  fetchSystemUsers, insertSystemUser, toggleUserStatus,
  fetchSettings,    saveSettings,
} from '../services/db';
import { isoToDisplay } from '../utils/helpers';
import { BUSINESS_SETTINGS } from '../data/seed';

// ─── Sales ──────────────────────────────────────────────────
export const useSupaSales = () => {
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetchSales()
      .then(setRecords)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const addOrUpdateSale = useCallback(
    async (date: string, amount: number, notes: string) => {
      const display = isoToDisplay(date);
      const record  = await upsertSale(date, amount, notes, display);
      setRecords((prev) => {
        const idx = prev.findIndex((r) => r.date === date);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = record;
          return next;
        }
        return [record, ...prev];
      });
    },
    []
  );

  // ── Delete one ─────────────────────────────────────────    ← NEW
  const removeSale = useCallback(async (id: string) => {
    await deleteSale(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // ── Delete all ─────────────────────────────────────────    ← NEW
  const removeAllSales = useCallback(async () => {
    await deleteAllSales();
    setRecords([]);
  }, []);

  return { records, loading, error, addOrUpdateSale, removeSale, removeAllSales };
};

// ─── Expenses ────────────────────────────────────────────────
export const useSupaExpenses = () => {
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetchExpenses()
      .then(setRecords)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const addExpense = useCallback(async (expense: Omit<ExpenseRecord, 'id'>) => {
    const record = await insertExpense(expense);
    setRecords((prev) => [record, ...prev]);
  }, []);

  return { records, loading, error, addExpense };
};

// ─── Customers ───────────────────────────────────────────────
export const useSupaCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetchCustomers()
      .then(setCustomers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addCustomer = useCallback(async (c: Omit<Customer, 'id'>) => {
    const record = await insertCustomer(c);
    setCustomers((prev) => [record, ...prev]);
  }, []);

  return { customers, loading, addCustomer };
};

// ─── System Users ────────────────────────────────────────────
export const useSupaUsers = () => {
  const [users,   setUsers]   = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addUser = useCallback(async (u: Omit<SystemUser, 'id'>) => {
    const record = await insertSystemUser(u);
    setUsers((prev) => [record, ...prev]);
  }, []);

  const toggleStatus = useCallback(
    async (id: string) => {
      const user = users.find((u) => u.id === id);
      if (!user) return;

      const next: 'Active' | 'Inactive' =
        user.status === 'Active' ? 'Inactive' : 'Active';

      await toggleUserStatus(id, user.status);

      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: next } : u))
      );
    },
    [users]
  );

  return { users, loading, addUser, toggleStatus };
};

// ─── Settings ────────────────────────────────────────────────
export const useSupaSettings = () => {
  const [settings, setSettings] = useState<BusinessSettings>(BUSINESS_SETTINGS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateSettings = useCallback(async (s: BusinessSettings) => {
    setSaving(true);
    await saveSettings(s);
    setSettings(s);
    setSaving(false);
  }, []);

  return { settings, loading, saving, updateSettings };
};