import { supabase } from '../lib/supabase';
import {
  SalesRecord,
  ExpenseRecord,
  Customer,
  SystemUser,
  BusinessSettings,
} from '../types';
import { addSystemLog } from './systemLogs';

// ─── helpers ─────────────────────────────────────────────────
const capitalize = (s: string): 'Active' | 'Inactive' => {
  const normalized = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return normalized as 'Active' | 'Inactive';
};

const row2Sale = (r: any): SalesRecord => ({
  id:          r.id,
  date:        r.date,
  displayDate: r.display_date,
  amount:      Number(r.amount),
  distributed: Number(r.distributed),
  notes:       r.notes ?? '',
  status:      r.status,
});

const row2Expense = (r: any): ExpenseRecord => ({
  id:          r.id,
  date:        r.date,
  displayDate: r.display_date,
  description: r.description,
  category:    r.category,
  amount:      Number(r.amount),
  addedBy:     r.added_by,
});

const row2Customer = (r: any): Customer => ({
  id:             r.id,
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

// ─── Get owner ID (works for both owner and staff) ───────────
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

// ─── Sales ───────────────────────────────────────────────────
export const fetchSales = async (): Promise<SalesRecord[]> => {
  const uid = await getUid();
  const { data, error } = await supabase
    .from('sales_records')
    .select('*')
    .eq('owner_id', uid)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row2Sale);
};

export const upsertSale = async (
  date: string,
  amount: number,
  notes: string,
  displayDate: string
): Promise<SalesRecord> => {
  const uid = await getUid();

  const { data, error } = await supabase
    .rpc('upsert_sale_bypass', {
      p_owner_id:     uid,
      p_date:         date,
      p_display_date: displayDate,
      p_amount:       amount,
      p_notes:        notes,
    })
    .single();

  if (error) throw error;

  addSystemLog(
    'Sale Saved',
    `P${amount.toLocaleString()} on ${displayDate}${notes ? ` — ${notes}` : ''}`,
    'sale'
  );

  return row2Sale(data);
};

export const deleteSale = async (id: string): Promise<void> => {
  const uid = await getUid();
  const { error } = await supabase
    .from('sales_records')
    .delete()
    .eq('id', id)
    .eq('owner_id', uid);
  if (error) throw error;

  addSystemLog('Sale Deleted', `Sale ID: ${id}`, 'delete');
};

export const deleteAllSales = async (): Promise<void> => {
  const uid = await getUid();
  const { error } = await supabase
    .from('sales_records')
    .delete()
    .eq('owner_id', uid);
  if (error) throw error;

  addSystemLog('All Sales Deleted', 'All sales records deleted', 'delete');
};

// ─── Expenses ────────────────────────────────────────────────
export const fetchExpenses = async (): Promise<ExpenseRecord[]> => {
  const uid = await getUid();
  const { data, error } = await supabase
    .from('expense_records')
    .select('*')
    .eq('owner_id', uid)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row2Expense);
};

export const insertExpense = async (
  expense: Omit<ExpenseRecord, 'id'>
): Promise<ExpenseRecord> => {
  const uid = await getUid();
  const { data, error } = await supabase
    .from('expense_records')
    .insert({
      owner_id:     uid,
      date:         expense.date,
      display_date: expense.displayDate,
      description:  expense.description,
      category:     expense.category,
      amount:       expense.amount,
      added_by:     expense.addedBy,
    })
    .select()
    .single();
  if (error) throw error;

  addSystemLog(
    'Expense Added',
    `${expense.description} — P${expense.amount.toLocaleString()} (${expense.category})`,
    'expense'
  );

  return row2Expense(data);
};

// ─── Customers ───────────────────────────────────────────────
export const fetchCustomers = async (): Promise<Customer[]> => {
  const uid = await getUid();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('owner_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row2Customer);
};

export const insertCustomer = async (
  c: Omit<Customer, 'id'>
): Promise<Customer> => {
  const uid = await getUid();
  const { data, error } = await supabase
    .from('customers')
    .insert({
      owner_id:        uid,
      name:            c.name,
      phone:           c.phone,
      email:           c.email,
      total_purchases: c.totalPurchases,
    })
    .select()
    .single();
  if (error) throw error;

  addSystemLog('Customer Added', `${c.name} — ${c.phone}`, 'sale');

  return row2Customer(data);
};

// ─── System Users ────────────────────────────────────────────
export const fetchSystemUsers = async (): Promise<SystemUser[]> => {
  const uid = await getUid();
  const { data, error } = await supabase
    .from('system_users')
    .select('*')
    .eq('owner_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row2User);
};

export const insertSystemUser = async (
  u: Omit<SystemUser, 'id'>
): Promise<SystemUser> => {
  const uid = await getUid();
  const { data, error } = await supabase
    .from('system_users')
    .insert({
      owner_id: uid,
      name:     u.name,
      initials: u.initials,
      role:     u.role,
      email:    u.email,
      status:   u.status,
      username: u.username,
      password: u.password,
    })
    .select()
    .single();
  if (error) throw error;

  addSystemLog('User Created', `${u.name} (${u.role}) — @${u.username}`, 'auth');

  return row2User(data);
};

export const toggleUserStatus = async (
  id: string,
  currentStatus: 'Active' | 'Inactive'
): Promise<void> => {
  const uid = await getUid();
  const next: 'Active' | 'Inactive' =
    currentStatus === 'Active' ? 'Inactive' : 'Active';
  const { error } = await supabase
    .from('system_users')
    .update({ status: next })
    .eq('id', id)
    .eq('owner_id', uid);
  if (error) throw error;

  addSystemLog('User Status Changed', `User ID: ${id} set to ${next}`, 'auth');
};

// ─── Business Settings ───────────────────────────────────────
export const fetchSettings = async (): Promise<BusinessSettings> => {
  const uid = await getUid();
  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .eq('owner_id', uid)
    .maybeSingle();

  if (error) throw error;
  if (!data) return {
    businessName: 'My Print Shop',
    owner:        '',
    address:      '',
    phone:        '',
    email:        '',
  };

  return {
    businessName: data.business_name,
    owner:        data.owner,
    address:      data.address,
    phone:        data.phone,
    email:        data.email,
  };
};

export const saveSettings = async (s: BusinessSettings): Promise<void> => {
  const uid = await getUid();
  const { error } = await supabase
    .from('business_settings')
    .update({
      business_name: s.businessName,
      owner:         s.owner,
      address:       s.address,
      phone:         s.phone,
      email:         s.email,
    })
    .eq('owner_id', uid);
  if (error) throw error;

  addSystemLog('Settings Updated', `Business name: ${s.businessName}`, 'settings');
};