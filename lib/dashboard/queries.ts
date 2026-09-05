/**
 * Dashboard data fetching — optimized for minimal round trips.
 * All queries use the server Supabase client — RLS enforced.
 */

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

export type AccountRow = Database['public']['Tables']['accounts']['Row']
export type TransactionRow = Database['public']['Tables']['transactions']['Row']
export type CategoryRow = Database['public']['Tables']['categories']['Row']

export interface AccountWithBalance extends AccountRow {
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

// ─── Single optimized dashboard query ────────────────────────────────────────

export async function getDashboardData(
  startDate: string,
  endDate: string,
): Promise<DashboardData> {
  const supabase = await createClient()

  // Fire ALL queries in parallel — single round trip per query
  const [
    accountsRes,
    allTxRes,       // for balance calculation
    periodTxRes,    // for period summary
    recentTxRes,    // for recent transactions list
    transfersRes,   // for balance adjustment
  ] = await Promise.all([
    // 1. Accounts
    supabase
      .from('accounts')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: true }),

    // 2. All transactions (for balance per account)
    supabase
      .from('transactions')
      .select('account_id, type, amount'),

    // 3. Period transactions (for income/expense summary + category spending)
    supabase
      .from('transactions')
      .select('type, amount, category:categories(id, name, icon, color)')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate),

    // 4. Recent transactions with joins
    supabase
      .from('transactions')
      .select('*, category:categories(id,name,icon,color,type), account:accounts(id,name,type)')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10),

    // 5. Transfers (for balance adjustment)
    supabase
      .from('transfers')
      .select('from_account_id, to_account_id, amount'),
  ])

  // ── Process accounts balance ──────────────────────────────────────────────
  const accounts = accountsRes.data ?? []
  const allTx = allTxRes.data ?? []
  const transfers = transfersRes.data ?? []

  const incomeMap = new Map<string, number>()
  const expenseMap = new Map<string, number>()

  for (const t of allTx) {
    if (t.type === 'income') {
      incomeMap.set(t.account_id, (incomeMap.get(t.account_id) ?? 0) + t.amount)
    } else {
      expenseMap.set(t.account_id, (expenseMap.get(t.account_id) ?? 0) + t.amount)
    }
  }

  const tfInMap = new Map<string, number>()
  const tfOutMap = new Map<string, number>()
  for (const t of transfers) {
    tfInMap.set(t.to_account_id, (tfInMap.get(t.to_account_id) ?? 0) + t.amount)
    tfOutMap.set(t.from_account_id, (tfOutMap.get(t.from_account_id) ?? 0) + t.amount)
  }

  const accountsWithBalance: AccountWithBalance[] = accounts.map(a => ({
    ...a,
    current_balance:
      a.initial_balance +
      (incomeMap.get(a.id) ?? 0) -
      (expenseMap.get(a.id) ?? 0) +
      (tfInMap.get(a.id) ?? 0) -
      (tfOutMap.get(a.id) ?? 0),
  }))

  const totalBalance = accountsWithBalance.reduce((s, a) => s + a.current_balance, 0)

  // ── Process period summary + category spending ────────────────────────────
  const periodTx = periodTxRes.data ?? []
  type CatJoin = { id: string; name: string; icon: string | null; color: string | null }

  let income = 0
  let expense = 0
  const catMap = new Map<string, CategorySpendingRow>()

  for (const t of periodTx) {
    if (t.type === 'income') {
      income += t.amount
    } else {
      expense += t.amount
      const cat = t.category as unknown as CatJoin | null
      if (cat) {
        const ex = catMap.get(cat.id)
        if (ex) ex.total += t.amount
        else catMap.set(cat.id, {
          category_id: cat.id,
          category_name: cat.name,
          category_icon: cat.icon,
          category_color: cat.color,
          total: t.amount,
        })
      }
    }
  }

  const categorySpending = Array.from(catMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

  return {
    accounts: accountsWithBalance,
    totalBalance,
    periodSummary: { income, expense },
    recentTransactions: (recentTxRes.data ?? []) as TransactionWithCategory[],
    categorySpending,
  }
}

// ─── Individual queries (kept for compatibility) ──────────────────────────────

export async function getAccountsWithBalance(): Promise<AccountWithBalance[]> {
  const { start, end } = { start: '2000-01-01', end: '2099-12-31' }
  const data = await getDashboardData(start, end)
  return data.accounts
}

export async function getPeriodSummary(startDate: string, endDate: string): Promise<PeriodSummary> {
  const data = await getDashboardData(startDate, endDate)
  return data.periodSummary
}

export async function getRecentTransactions(limit = 10): Promise<TransactionWithCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*, category:categories(id,name,icon,color,type), account:accounts(id,name,type)')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as TransactionWithCategory[]
}

export async function getCategorySpending(
  startDate: string,
  endDate: string,
  limit = 6,
): Promise<CategorySpendingRow[]> {
  const data = await getDashboardData(startDate, endDate)
  return data.categorySpending.slice(0, limit)
}
