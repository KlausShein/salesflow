import { useState, useCallback, useEffect } from 'react';
import { Transaction, SalesRecord, ExpenseRecord } from '../types';
import { SEED_SALES, SEED_EXPENSES } from '../data/seed';
import { generateId, isoToDisplay } from '../utils/helpers';

// ── useTransactions ───────────────────────────────────────
export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(SEED_SALES as Transaction[]);

  const addTransaction = useCallback((txn: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [{ ...txn, id: generateId() }, ...prev]);
  }, []);

  return { transactions, addTransaction };
};

// ── useSalesRecords ───────────────────────────────────────
export const useSalesRecords = () => {
  const [records, setRecords] = useState<SalesRecord[]>(SEED_SALES);

  const addOrUpdateSale = useCallback(
    (date: string, amount: number, notes: string) => {
      const display = isoToDisplay(date);
      setRecords((prev) => {
        const idx = prev.findIndex((r) => r.date === date);
        const record: SalesRecord = {
          id:          idx >= 0 ? prev[idx].id : generateId(),
          date,
          displayDate: display,
          amount,
          distributed: amount,
          notes,
          status:      'Completed',
        };
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

  return { records, addOrUpdateSale };
};

// ── useExpenseRecords ──────────────────────────────────────
export const useExpenseRecords = () => {
  const [records, setRecords] = useState<ExpenseRecord[]>(SEED_EXPENSES);

  const addExpense = useCallback(
    (expense: Omit<ExpenseRecord, 'id'>) => {
      setRecords((prev) => [{ ...expense, id: generateId() }, ...prev]);
    },
    []
  );

  return { records, addExpense };
};

// ── useLiveClock ──────────────────────────────────────────
export const useLiveClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
};

// ── useActivePage ─────────────────────────────────────────
export const useActivePage = (initial: string = 'dashboard') => {
  const [activePage, setActivePage] = useState(initial);
  return { activePage, setActivePage };
};