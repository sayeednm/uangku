/**
 * Rekening (Account) queries.
 * All queries use the server Supabase client — RLS enforced.
 */

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

export type AccountRow = Database['public']['Tables']['accounts']['Row']
export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
export type AccountUpdate = Database['public']['Tables']['accounts']['Update']
export type { AccountType } from '@/types/database.types'

export interface AccountWithBalance extends AccountRow {
  current_balance: number
  income_total: number
  expense_total: number
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all non-archived accounts for the authenticated user, with computed balances.
 */
export async function getAccounts(): Promise<AccountWithBalance[]> {
  const supabase = await createClient()

  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: true })

  if (error) throw error
  if (!accounts || accounts.length === 0) return []

  const ids = accounts.map(a => a.id)

  const [incomeRes, expenseRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('account_id, amount')
      .in('account_id', ids)
      .eq('type', 'income'),
    supabase
      .from('transactions')
      .select('account_id, amount')
      .in('account_id', ids)
      .eq('type', 'expense'),
  ])

  if (incomeRes.error) throw incomeRes.error
  if (expenseRes.error) throw expenseRes.error

  const incomeMap = new Map<string, number>()
  const expenseMap = new Map<string, number>()

  for (const r of incomeRes.data ?? []) {
    incomeMap.set(r.account_id, (incomeMap.get(r.account_id) ?? 0) + r.amount)
  }
  for (const r of expenseRes.data ?? []) {
    expenseMap.set(r.account_id, (expenseMap.get(r.account_id) ?? 0) + r.amount)
  }

  // ── Transfers ─────────────────────────────────────────────────────────────
  const transferOutMap = new Map<string, number>()
  const transferInMap  = new Map<string, number>()

  const [tfOutRes, tfInRes] = await Promise.all([
    supabase.from('transfers').select('from_account_id, amount').in('from_account_id', ids),
    supabase.from('transfers').select('to_account_id, amount').in('to_account_id', ids),
  ])

  for (const t of tfOutRes.data ?? []) {
    transferOutMap.set(t.from_account_id, (transferOutMap.get(t.from_account_id) ?? 0) + t.amount)
  }
  for (const t of tfInRes.data ?? []) {
    transferInMap.set(t.to_account_id, (transferInMap.get(t.to_account_id) ?? 0) + t.amount)
  }

  return accounts.map(a => {
    const income = incomeMap.get(a.id) ?? 0
    const expense = expenseMap.get(a.id) ?? 0
    const tfIn  = transferInMap.get(a.id) ?? 0
    const tfOut = transferOutMap.get(a.id) ?? 0
    return {
      ...a,
      income_total: income,
      expense_total: expense,
      current_balance: a.initial_balance + income - expense + tfIn - tfOut,
    }
  })
}

/**
 * Fetch a single account by id (must belong to authenticated user via RLS).
 */
export async function getAccountById(id: string): Promise<AccountRow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw error
  }
  return data
}

/**
 * Fetch archived accounts.
 */
export async function getArchivedAccounts(): Promise<AccountRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('is_archived', true)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

// ─── Write ────────────────────────────────────────────────────────────────────

export interface CreateAccountInput {
  name: string
  type: AccountRow['type']
  initial_balance: number
}

export async function createAccount(input: CreateAccountInput): Promise<AccountRow> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak terautentikasi')

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      type: input.type,
      initial_balance: input.initial_balance,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export interface UpdateAccountInput {
  name?: string
  type?: AccountRow['type']
  initial_balance?: number
}

export async function updateAccount(id: string, input: UpdateAccountInput): Promise<AccountRow> {
  const supabase = await createClient()

  const update: Record<string, unknown> = {}
  if (input.name !== undefined) update.name = input.name.trim()
  if (input.type !== undefined) update.type = input.type
  if (input.initial_balance !== undefined) update.initial_balance = input.initial_balance

  const { data, error } = await supabase
    .from('accounts')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function archiveAccount(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('accounts')
    .update({ is_archived: true })
    .eq('id', id)

  if (error) throw error
}

export async function unarchiveAccount(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('accounts')
    .update({ is_archived: false })
    .eq('id', id)

  if (error) throw error
}
