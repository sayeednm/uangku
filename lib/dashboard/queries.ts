/**
 * Dashboard data fetching functions.
 * All queries use the server Supabase client — RLS enforced via authenticated session.
 * Never uses service_role key.
 */

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

export type AccountRow = Database['public']['Tables']['accounts']['Row']
export type TransactionRow = Database['public']['Tables']['transactions']['Row']
export type CategoryRow = Database['public']['Tables']['categories']['Row']

// ─── Shape types ─────────────────────────────────────────────────────────────

export interface AccountWithBalance extends AccountRow {
  /** Computed: initial_balance + income - expense from transactions */
  current_balance: number
}

export interface TransactionWithCategory extends TransactionRow {
  category: Pick<CategoryRow, 'id' | 'name' | 'icon' | 'color' | 'type'>
  account: Pick<AccountRow, 'id' | 'name' | 'type'>
}

export interface PeriodSummary {
  income: number
  expense: number
}

export interface CategorySpendingRow {
  category_id: string
  category_name: string
  category_icon: string | null
  category_color: string | null
  total: number
}

export interface DashboardData {
  accounts: AccountWithBalance[]
  totalBalance: number
  periodSummary: PeriodSummary
  recentTransactions: TransactionWithCategory[]
  categorySpending: CategorySpendingRow[]
}

// ─── Accounts ────────────────────────────────────────────────────────────────

/**
 * Fetch all non-archived accounts for the authenticated user,
 * then compute current_balance for each account using its transactions.
 */
export async function getAccountsWithBalance(): Promise<AccountWithBalance[]> {
  const supabase = await createClient()

  // Fetch accounts
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: true })

  if (accountsError) throw accountsError
  if (!accounts || accounts.length === 0) return []

  const accountIds = accounts.map(a => a.id)

  // Fetch all income transactions for these accounts
  const { data: incomeData, error: incomeError } = await supabase
    .from('transactions')
    .select('account_id, amount')
    .in('account_id', accountIds)
    .eq('type', 'income')

  if (incomeError) throw incomeError

  // Fetch all expense transactions for these accounts
  const { data: expenseData, error: expenseError } = await supabase
    .from('transactions')
    .select('account_id, amount')
    .in('account_id', accountIds)
    .eq('type', 'expense')

  if (expenseError) throw expenseError

  // Build maps: account_id → total
  const incomeMap = new Map<string, number>()
  const expenseMap = new Map<string, number>()

  for (const row of incomeData ?? []) {
    incomeMap.set(row.account_id, (incomeMap.get(row.account_id) ?? 0) + row.amount)
  }
  for (const row of expenseData ?? []) {
    expenseMap.set(row.account_id, (expenseMap.get(row.account_id) ?? 0) + row.amount)
  }

  // ── Transfers: deduct from source, add to destination ────────────────────
  const transferOutMap = new Map<string, number>()
  const transferInMap  = new Map<string, number>()

  const { data: transfersOut, error: tfOutErr } = await supabase
    .from('transfers')
    .select('from_account_id, to_account_id, amount')
    .in('from_account_id', accountIds)

  if (tfOutErr) throw tfOutErr

  const { data: transfersIn, error: tfInErr } = await supabase
    .from('transfers')
    .select('from_account_id, to_account_id, amount')
    .in('to_account_id', accountIds)

  if (tfInErr) throw tfInErr

  for (const t of transfersOut ?? []) {
    transferOutMap.set(t.from_account_id, (transferOutMap.get(t.from_account_id) ?? 0) + t.amount)
  }
  for (const t of transfersIn ?? []) {
    transferInMap.set(t.to_account_id, (transferInMap.get(t.to_account_id) ?? 0) + t.amount)
  }

  return accounts.map(account => ({
    ...account,
    current_balance:
      account.initial_balance +
      (incomeMap.get(account.id) ?? 0) -
      (expenseMap.get(account.id) ?? 0) +
      (transferInMap.get(account.id) ?? 0) -
      (transferOutMap.get(account.id) ?? 0),
  }))
}

// ─── Period Summary ───────────────────────────────────────────────────────────

/**
 * Fetch total income and expense for a given date range.
 * Transfers are excluded — only 'income' and 'expense' transaction types.
 */
export async function getPeriodSummary(
  startDate: string,
  endDate: string,
): Promise<PeriodSummary> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)

  if (error) throw error

  let income = 0
  let expense = 0

  for (const row of data ?? []) {
    if (row.type === 'income') income += row.amount
    else if (row.type === 'expense') expense += row.amount
  }

  return { income, expense }
}

// ─── Recent Transactions ──────────────────────────────────────────────────────

/**
 * Fetch the N most recent transactions with their category and account info.
 */
export async function getRecentTransactions(
  limit = 10,
): Promise<TransactionWithCategory[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      category:categories ( id, name, icon, color, type ),
      account:accounts ( id, name, type )
    `)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data ?? []) as TransactionWithCategory[]
}

// ─── Category Spending ────────────────────────────────────────────────────────

/**
 * Fetch expense totals grouped by category for a given date range.
 * Returns top categories sorted by total descending.
 */
export async function getCategorySpending(
  startDate: string,
  endDate: string,
  limit = 6,
): Promise<CategorySpendingRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      amount,
      category:categories ( id, name, icon, color )
    `)
    .eq('type', 'expense')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)

  if (error) throw error

  // Aggregate by category client-side (avoids needing a DB function)
  type CatJoin = { id: string; name: string; icon: string | null; color: string | null }
  const map = new Map<string, CategorySpendingRow>()

  for (const row of data ?? []) {
    const cat = row.category as unknown as CatJoin | null
    if (!cat) continue

    const existing = map.get(cat.id)
    if (existing) {
      existing.total += row.amount
    } else {
      map.set(cat.id, {
        category_id:    cat.id,
        category_name:  cat.name,
        category_icon:  cat.icon,
        category_color: cat.color,
        total:          row.amount,
      })
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

// ─── Aggregate ────────────────────────────────────────────────────────────────

/**
 * Fetch all dashboard data in parallel.
 * Returns structured data or throws on Supabase error.
 */
export async function getDashboardData(
  startDate: string,
  endDate: string,
): Promise<DashboardData> {
  const [accounts, periodSummary, recentTransactions, categorySpending] =
    await Promise.all([
      getAccountsWithBalance(),
      getPeriodSummary(startDate, endDate),
      getRecentTransactions(10),
      getCategorySpending(startDate, endDate),
    ])

  const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0)

  return {
    accounts,
    totalBalance,
    periodSummary,
    recentTransactions,
    categorySpending,
  }
}
