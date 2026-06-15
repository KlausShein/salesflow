import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface AssistantContext {
  today: string;
  recentSales: object[];
  recentExpenses: object[];
  summary: {
    totalSalesToday: number;
    totalExpensesToday: number;
    totalSalesThisMonth: number;
    totalExpensesThisMonth: number;
    netIncomeToday: number;
    netIncomeThisMonth: number;
  };
}

export function useAssistantContext() {
  const fetchContext = useCallback(async (): Promise<AssistantContext> => {
    const today        = new Date().toISOString().split('T')[0];
    const firstOfMonth = today.slice(0, 7) + '-01';

    const empty = {
      today,
      recentSales: [],
      recentExpenses: [],
      summary: {
        totalSalesToday: 0, totalExpensesToday: 0,
        totalSalesThisMonth: 0, totalExpensesThisMonth: 0,
        netIncomeToday: 0, netIncomeThisMonth: 0,
      },
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return empty;

    // Resolve tenant_id: active tenant from localStorage, else user's first role
    let tenant_id: string | null = null;
    try {
      const stored = localStorage.getItem('printpos_active_tenant');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.tenantId) tenant_id = parsed.tenantId;
      }
    } catch { /* ignore */ }

    if (!tenant_id) {
      const { data: roleData, error: roleErr } = await supabase
        .from('user_business_roles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (roleErr || !roleData) {
        console.warn('[AssistantContext] Could not get tenant:', roleErr?.message);
        return empty;
      }
      tenant_id = roleData.tenant_id;
    }

    // Run all queries in parallel using correct column names
    const [salesTodayRes, recentSalesRes, salesMonthRes, expTodayRes, expMonthRes] =
      await Promise.all([
        // Sales today
        supabase
          .from('sales_records')
          .select('amount')
          .eq('tenant_id', tenant_id)
          .eq('date', today),

        // Last 10 sales
        supabase
          .from('sales_records')
          .select('date, display_date, amount, distributed, notes, status')
          .eq('tenant_id', tenant_id)
          .order('date', { ascending: false })
          .limit(10),

        // Sales this month
        supabase
          .from('sales_records')
          .select('amount')
          .eq('tenant_id', tenant_id)
          .gte('date', firstOfMonth),

        // Expenses today
        supabase
          .from('expense_records')
          .select('amount, category, description')
          .eq('tenant_id', tenant_id)
          .eq('date', today),

        // Expenses this month
        supabase
          .from('expense_records')
          .select('date, display_date, amount, category, description, status')
          .eq('tenant_id', tenant_id)
          .gte('date', firstOfMonth)
          .order('date', { ascending: false })
          .limit(20),
      ]);

    [salesTodayRes, recentSalesRes, salesMonthRes, expTodayRes, expMonthRes]
      .forEach(r => { if (r.error) console.warn('[AssistantContext]', r.error.message); });

    const sumField = (rows: any[], field: string) =>
      (rows ?? []).reduce((acc, r) => acc + (Number(r[field]) || 0), 0);

    const totalSalesToday        = sumField(salesTodayRes.data  ?? [], 'amount');
    const totalSalesThisMonth    = sumField(salesMonthRes.data  ?? [], 'amount');
    const totalExpensesToday     = sumField(expTodayRes.data    ?? [], 'amount');
    const totalExpensesThisMonth = sumField(expMonthRes.data    ?? [], 'amount');

    return {
      today,
      recentSales:    recentSalesRes.data ?? [],
      recentExpenses: expMonthRes.data    ?? [],
      summary: {
        totalSalesToday,
        totalExpensesToday,
        totalSalesThisMonth,
        totalExpensesThisMonth,
        netIncomeToday:     totalSalesToday     - totalExpensesToday,
        netIncomeThisMonth: totalSalesThisMonth - totalExpensesThisMonth,
      },
    };
  }, []);

  return { fetchContext };
}