import { supabase } from '../lib/supabase';
import {
  SalesRecord,
  ExpenseRecord,
  Customer,
  SystemUser,
  BusinessSettings,
  DistributionCategory,
  WorkingDaysConfig,
  Tenant,
  UserBusinessRole,
  SystemLog,
} from '../types';
import { addSystemLog } from './systemLogs';

// ─── MULTI-TENANT HELPERS ────────────────────────────────────

const isValidUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const getUid = async (): Promise<string> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch { /* no session */ }

  try {
    const stored = localStorage.getItem('printpos_active_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.ownerId) return parsed.ownerId;
    }
  } catch { /* ignore */ }

  throw new Error('Not authenticated');
};

const getCurrentTenantId = async (): Promise<string> => {
  try {
    const stored = localStorage.getItem('printpos_active_tenant');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.tenantId && isValidUUID(parsed.tenantId)) {
        return parsed.tenantId;
      }
    }
  } catch { /* ignore */ }

  const uid = await getUid();
  const { data, error } = await supabase
    .from('user_business_roles')
    .select('tenant_id')
    .eq('user_id', uid)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No tenant found for user. Please contact your admin.');

  return data.tenant_id;
};

export const getUserTenants = async (): Promise<Tenant[]> => {
  const uid = await getUid();
  const { data, error } = await supabase
    .from('user_business_roles')
    .select('tenants(*)')
    .eq('user_id', uid);

  if (error) throw error;
  return (data ?? []).map((d: any) => d.tenants).filter(Boolean);
};

export const createTenant = async (businessName: string): Promise<Tenant> => {
  const uid = await getUid();

  const { data, error } = await supabase
    .from('tenants')
    .insert({ business_name: businessName, owner_id: uid, status: 'active' })
    .select()
    .single();

  if (error) throw error;

  await supabase.from('user_business_roles').insert({
    tenant_id: data.id,
    user_id:   uid,
    role:      'Admin',
  });

  addSystemLog('Tenant Created', `Business: ${businessName}`, 'settings');

  return {
    id:           data.id,
    businessName: data.business_name,
    ownerId:      data.owner_id,
    createdAt:    data.created_at,
    status:       data.status,
  };
};

export const switchTenant = async (tenantId: string): Promise<void> => {
  localStorage.setItem('printpos_active_tenant', JSON.stringify({ tenantId }));
};

// ─── Row helpers ─────────────────────────────────────────────

const capitalize = (s: string): 'Active' | 'Inactive' => {
  const normalized = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return normalized as 'Active' | 'Inactive';
};

const row2Sale = (r: any): SalesRecord => ({
  id:          r.id,
  tenantId:    r.tenant_id,
  date:        r.date,
  displayDate: r.display_date,
  amount:      Number(r.amount),
  distributed: Number(r.distributed ?? 0),
  notes:       r.notes ?? '',
  status:      r.status ?? 'Completed',
});

const row2Expense = (r: any): ExpenseRecord => ({
  id:          r.id,
  tenantId:    r.tenant_id,
  date:        r.date,
  displayDate: r.display_date,
  description: r.description,
  category:    r.category,
  amount:      Number(r.amount),
  addedBy:     r.added_by,
  status:      r.status ?? 'Completed',
});

const row2Customer = (r: any): Customer => ({
  id:             r.id,
  tenantId:       r.tenant_id,
  name:           r.name,
  phone:          r.phone,
  email:          r.email,
  totalPurchases: Number(r.total_purchases),
});

const row2User = (r: any): SystemUser => ({
  id:       r.id,
  name:     r.name,
  initials: r.initials,
  role:     r.role,
  email:    r.email,
  status:   capitalize(r.status),
  username: r.username,
  password: r.password,
});

// ─── Sales ──────────────────────────────────────────────────

export const fetchSales = async (): Promise<SalesRecord[]> => {
  const tenantId = await getCurrentTenantId();
  const { data, error } = await supabase
    .from('sales_records')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row2Sale);
};

export const upsertSale = async (
  date:        string,
  amount:      number,
  notes:       string,
  displayDate: string
): Promise<SalesRecord> => {
  const tenantId = await getCurrentTenantId();

  const { data, error } = await supabase
    .rpc('upsert_sale_bypass', {
      p_tenant_id:    tenantId,
      p_date:         date,
      p_display_date: displayDate,
      p_amount:       amount,
      p_notes:        notes,
    })
    .single();

  if (error) {
    console.error('[upsertSale] RPC error:', error);
    throw new Error(error.message ?? 'Failed to save sale');
  }

  if (!data) throw new Error('Sale saved but no data returned');

  addSystemLog(
    'Sale Saved',
    `P${amount.toLocaleString()} on ${displayDate}${notes ? ` — ${notes}` : ''}`,
    'sale'
  );

  return row2Sale(data);
};

// FIXED: uses bypass RPC so staff (anon role, no auth.uid()) can delete too
export const deleteSale = async (id: string): Promise<void> => {
  const tenantId = await getCurrentTenantId();
  const { error } = await supabase.rpc('delete_sale_bypass', {
    p_id:        id,
    p_tenant_id: tenantId,
  });
  if (error) {
    console.error('[deleteSale] RPC error:', error);
    throw new Error(error.message ?? 'Failed to delete sale');
  }
  addSystemLog('Sale Deleted', `Sale ID: ${id}`, 'delete');
};

// FIXED: uses bypass RPC so staff (anon role, no auth.uid()) can delete too
export const deleteAllSales = async (): Promise<void> => {
  const tenantId = await getCurrentTenantId();
  const { error } = await supabase.rpc('delete_all_sales_bypass', {
    p_tenant_id: tenantId,
  });
  if (error) {
    console.error('[deleteAllSales] RPC error:', error);
    throw new Error(error.message ?? 'Failed to delete all sales');
  }
  addSystemLog('All Sales Deleted', 'All sales records deleted', 'delete');
};

// ─── Expenses ────────────────────────────────────────────────

export const fetchExpenses = async (): Promise<ExpenseRecord[]> => {
  const tenantId = await getCurrentTenantId();
  const { data, error } = await supabase
    .from('expense_records')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row2Expense);
};

// FIXED: uses bypass RPC instead of direct .insert() so staff
// (anon role, auth.uid() always null) can add expenses.
export const insertExpense = async (
  expense: Omit<ExpenseRecord, 'id' | 'tenantId'>
): Promise<ExpenseRecord> => {
  const tenantId = await getCurrentTenantId();

  const { data, error } = await supabase
    .rpc('insert_expense_bypass', {
      p_tenant_id:    tenantId,
      p_date:         expense.date,
      p_display_date: expense.displayDate,
      p_description:  expense.description ?? '',
      p_category:     expense.category,
      p_amount:       expense.amount,
      p_added_by:     expense.addedBy,
    })
    .single();

  if (error) {
    console.error('[insertExpense] RPC error:', error);
    throw new Error(error.message ?? 'Failed to save expense');
  }
  if (!data) throw new Error('Expense saved but no data returned');

  addSystemLog(
    'Expense Added',
    `${expense.description} — P${expense.amount.toLocaleString()} (${expense.category})`,
    'expense'
  );

  return row2Expense(data);
};

// FIXED: uses bypass RPC so staff can delete expenses too
export const deleteExpense = async (id: string): Promise<void> => {
  const tenantId = await getCurrentTenantId();
  const { error } = await supabase.rpc('delete_expense_bypass', {
    p_id:        id,
    p_tenant_id: tenantId,
  });
  if (error) {
    console.error('[deleteExpense] RPC error:', error);
    throw new Error(error.message ?? 'Failed to delete expense');
  }
  addSystemLog('Expense Deleted', `Expense ID: ${id}`, 'delete');
};

// ─── Customers ───────────────────────────────────────────────

export const fetchCustomers = async (): Promise<Customer[]> => {
  const tenantId = await getCurrentTenantId();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row2Customer);
};

// FIXED: uses bypass RPC instead of direct .insert() so staff can add customers
export const insertCustomer = async (
  c: Omit<Customer, 'id' | 'tenantId'>
): Promise<Customer> => {
  const tenantId = await getCurrentTenantId();

  const { data, error } = await supabase
    .rpc('insert_customer_bypass', {
      p_tenant_id:       tenantId,
      p_name:            c.name,
      p_phone:           c.phone,
      p_email:           c.email,
      p_total_purchases: c.totalPurchases ?? 0,
    })
    .single();

  if (error) {
    console.error('[insertCustomer] RPC error:', error);
    throw new Error(error.message ?? 'Failed to save customer');
  }
  if (!data) throw new Error('Customer saved but no data returned');

  addSystemLog('Customer Added', `${c.name} — ${c.phone}`, 'sale');
  return row2Customer(data);
};

// ─── System Users ────────────────────────────────────────────
// NOTE: insertSystemUser is only ever called by Admins (who DO have
// a Supabase Auth session via ownerLogin), so it can safely use
// direct table inserts protected by the user_business_roles_insert
// and system_users_insert RLS policies (which check auth.uid()).

export const fetchSystemUsers = async (): Promise<SystemUser[]> => {
  const tenantId = await getCurrentTenantId();

  const { data, error } = await supabase
    .from('user_business_roles')
    .select('system_users(*)')
    .eq('tenant_id', tenantId);

  if (error) throw error;
  return (data ?? []).map((d: any) => row2User(d.system_users)).filter(Boolean);
};

/**
 * Insert a system user and assign to current tenant.
 * Accepts explicit tenantId from useSupabase hook to ensure
 * new users always get linked to the correct tenant.
 * Called by Admin only (has Supabase Auth session) — direct
 * inserts are protected by RLS policies using auth.uid().
 */
export const insertSystemUser = async (
  u:                 Omit<SystemUser, 'id'>,
  explicitTenantId?: string
): Promise<SystemUser> => {
  const tenantId = (explicitTenantId && isValidUUID(explicitTenantId))
    ? explicitTenantId
    : await getCurrentTenantId();

  // Hash the password before storing
  let hashedPassword = u.password ?? '';
  try {
    const { data: hashData, error: hashError } = await supabase
      .rpc('hash_password', { p_password: u.password ?? '' });
    if (!hashError && hashData) {
      hashedPassword = hashData;
    }
  } catch {
    console.warn('Password hashing failed, storing as-is');
  }

  const { data: userData, error: userError } = await supabase
    .from('system_users')
    .insert({
      name:     u.name,
      initials: u.initials,
      role:     u.role,
      email:    u.email,
      status:   u.status,
      username: u.username,
      password: hashedPassword,
    })
    .select()
    .single();

  if (userError) throw userError;

  // Link user to the correct tenant
  const { error: roleError } = await supabase
    .from('user_business_roles')
    .insert({
      tenant_id: tenantId,
      user_id:   userData.id,
      role:      u.role,
    });

  if (roleError) {
    console.error('[insertSystemUser] Failed to link user to tenant:', roleError);
    // Roll back: delete the orphaned system_users row so we don't
    // leave a "ghost" user with no tenant link (the bug we hit earlier)
    await supabase.from('system_users').delete().eq('id', userData.id);
    throw new Error(
      `Failed to link new user to your business: ${roleError.message}. ` +
      `The user was not created — please try again.`
    );
  }

  addSystemLog('User Created', `${u.name} (${u.role}) — @${u.username}`, 'auth');
  return row2User(userData);
};

export const toggleUserStatus = async (
  id:            string,
  currentStatus: 'Active' | 'Inactive'
): Promise<void> => {
  const next: 'Active' | 'Inactive' =
    currentStatus === 'Active' ? 'Inactive' : 'Active';

  const { error } = await supabase
    .from('system_users')
    .update({ status: next })
    .eq('id', id);

  if (error) throw error;
  addSystemLog('User Status Changed', `User ID: ${id} set to ${next}`, 'auth');
};

// ─── Business Settings ───────────────────────────────────────

export const fetchSettings = async (): Promise<BusinessSettings> => {
  const tenantId = await getCurrentTenantId();
  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return {
    tenantId,
    businessName: 'My Business',
    owner:        '',
    address:      '',
    phone:        '',
    email:        '',
  };

  return {
    tenantId:     data.tenant_id,
    businessName: data.business_name,
    owner:        data.owner,
    address:      data.address,
    phone:        data.phone,
    email:        data.email,
    currency:     data.currency,
    timezone:     data.timezone,
    theme:        data.theme,
    language:     data.language,
  };
};

export const saveSettings = async (s: BusinessSettings): Promise<void> => {
  const tenantId = await getCurrentTenantId();
  const { error } = await supabase
    .from('business_settings')
    .update({
      tenant_id:     tenantId,
      business_name: s.businessName,
      owner:         s.owner,
      address:       s.address,
      phone:         s.phone,
      email:         s.email,
      currency:      s.currency,
      timezone:      s.timezone,
      theme:         s.theme,
      language:      s.language,
    })
    .eq('tenant_id', tenantId);
  if (error) throw error;
  addSystemLog('Settings Updated', `Business name: ${s.businessName}`, 'settings');
};

// ─── Distribution Categories ────────────────────────────────

export const fetchDistribution = async (): Promise<DistributionCategory[] | null> => {
  const tenantId = await getCurrentTenantId();
  const { data, error } = await supabase
    .from('business_settings')
    .select('distribution_categories')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) throw error;
  return data?.distribution_categories ?? null;
};

export const saveDistribution = async (
  categories: DistributionCategory[]
): Promise<void> => {
  const tenantId = await getCurrentTenantId();

  const categoriesWithTenant = categories.map(c => ({ ...c, tenantId }));

  const { error } = await supabase
    .from('business_settings')
    .update({ distribution_categories: categoriesWithTenant })
    .eq('tenant_id', tenantId);
  if (error) throw error;

  addSystemLog(
    'Distribution Updated',
    `${categories.length} categories — total ${categories.reduce((s, c) => s + (c.percentage ?? 0), 0)}%`,
    'settings'
  );
};

// ─── Working Days Configuration ──────────────────────────────

export const fetchWorkingDays = async (): Promise<WorkingDaysConfig | null> => {
  try {
    const tenantId = await getCurrentTenantId();

    const { data, error } = await supabase
      .from('business_settings')
      .select('working_days_config')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching working days:', error);
      throw error;
    }

    if (!data) {
      console.info('No business_settings row found, will create on first save');
      return null;
    }

    return data.working_days_config ?? null;
  } catch (err) {
    console.error('Failed to fetch working days:', err);
    throw err;
  }
};

export const saveWorkingDays = async (config: WorkingDaysConfig): Promise<void> => {
  try {
    if (!config) throw new Error('Configuration is required');

    const tenantId = await getCurrentTenantId();

    const { error: updateError } = await supabase
      .from('business_settings')
      .update({ working_days_config: config })
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to save working days: ${updateError.message}`);
    }

    addSystemLog(
      'Working Days Updated',
      `${config.workingDaysPerMonth} working days configured`,
      'settings'
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error in saveWorkingDays:', errorMessage, err);
    throw new Error(`Failed to save working days: ${errorMessage}`);
  }
};