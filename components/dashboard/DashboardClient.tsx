'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPeriodRange, getCurrentMonthLabel, type PeriodKey } from '@/lib/utils/date'
import PeriodSelector from './PeriodSelector'
import BalanceSummary from './BalanceSummary'
import RecentTransactions from './RecentTransactions'
import AccountsOverview from './AccountsOverview'
import CategorySpending from './CategorySpending'
import DashboardSkeleton from './DashboardSkeleton'
import DashboardError from './DashboardError'
import OnboardingEmpty from './OnboardingEmpty'
import type { DashboardData } from '@/lib/dashboard/queries'

// Period selector and refetch live on the client.
// Initial data is passed from the server component as a prop to avoid
// a loading flash on first render.
interface DashboardClientProps {
  initialData: DashboardData
  initialPeriod: PeriodKey
}

export default function DashboardClient({
  initialData,
  initialPeriod,
}: DashboardClientProps) {
  const [period, setPeriod] = useState<PeriodKey>(initialPeriod)
  const [data, setData] = useState<DashboardData>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  // On period change, re-fetch only the period-sensitive parts
  // (periodSummary + categorySpending). Accounts and recentTransactions
  // are not period-filtered so we keep the initial values.
  const fetchPeriodData = useCallback(async (p: PeriodKey) => {
    setLoading(true)
    setError(false)

    try {
      const supabase = createClient()
      const { start, end } = getPeriodRange(p)

      // Fetch income/expense totals for the period
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('type, amount')
        .gte('transaction_date', start)
        .lte('transaction_date', end)

      if (txError) throw txError

      let income = 0
      let expense = 0
      for (const row of txData ?? []) {
        if (row.type === 'income') income += row.amount
        else if (row.type === 'expense') expense += row.amount
      }

      // Fetch expense by category for the period
      const { data: catData, error: catError } = await supabase
        .from('transactions')
        .select('amount, category:categories ( id, name, icon, color )')
        .eq('type', 'expense')
        .gte('transaction_date', start)
        .lte('transaction_date', end)

      if (catError) throw catError

      // Aggregate by category
      type CatShape = { id: string; name: string; icon: string | null; color: string | null }
      const catMap = new Map<string, { category_id: string; category_name: string; category_icon: string | null; category_color: string | null; total: number }>()

      for (const row of catData ?? []) {
        const cat = row.category as unknown as CatShape | null
        if (!cat) continue
        const existing = catMap.get(cat.id)
        if (existing) {
          existing.total += row.amount
        } else {
          catMap.set(cat.id, {
            category_id:    cat.id,
            category_name:  cat.name,
            category_icon:  cat.icon,
            category_color: cat.color,
            total:          row.amount,
          })
        }
      }

      const categorySpending = Array.from(catMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 6)

      setData(prev => ({
        ...prev,
        periodSummary:    { income, expense },
        categorySpending,
      }))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Refetch whenever period changes (skip on first render — initialData already correct)
  const [isFirstRender, setIsFirstRender] = useState(true)
  useEffect(() => {
    if (isFirstRender) {
      setIsFirstRender(false)
      return
    }
    fetchPeriodData(period)
  }, [period, fetchPeriodData, isFirstRender])

  // ── Realtime: refresh accounts + recent transactions on any change ──────────
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' },
        async () => {
          // Re-fetch accounts (balance changes) + recent transactions
          try {
            const [accRes, txRes] = await Promise.all([
              supabase
                .from('accounts')
                .select('*')
                .eq('is_archived', false)
                .order('created_at', { ascending: true }),
              supabase
                .from('transactions')
                .select('*, category:categories(id,name,icon,color,type), account:accounts(id,name,type)')
                .order('transaction_date', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(10),
            ])

            if (accRes.data && txRes.data) {
              // Recalculate balances
              const ids = accRes.data.map(a => a.id)
              const [incRes, expRes] = await Promise.all([
                supabase.from('transactions').select('account_id, amount').in('account_id', ids).eq('type', 'income'),
                supabase.from('transactions').select('account_id, amount').in('account_id', ids).eq('type', 'expense'),
              ])

              const incMap = new Map<string, number>()
              const expMap = new Map<string, number>()
              for (const r of incRes.data ?? []) incMap.set(r.account_id, (incMap.get(r.account_id) ?? 0) + r.amount)
              for (const r of expRes.data ?? []) expMap.set(r.account_id, (expMap.get(r.account_id) ?? 0) + r.amount)

              const accountsWithBalance = accRes.data.map(a => ({
                ...a,
                current_balance: a.initial_balance + (incMap.get(a.id) ?? 0) - (expMap.get(a.id) ?? 0),
              }))
              const totalBalance = accountsWithBalance.reduce((s, a) => s + a.current_balance, 0)

              setData(prev => ({
                ...prev,
                accounts: accountsWithBalance,
                totalBalance,
                recentTransactions: txRes.data as typeof prev.recentTransactions,
              }))
            }
          } catch { /* silent — data already shown */ }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const periodLabel = getPeriodRange(period).label
  const monthLabel = getCurrentMonthLabel()

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="animate-fade-up mb-4">
        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Selamat datang kembali</p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">Ringkasan Keuangan</h1>
        <div className="flex items-center justify-between mt-2 gap-2">
          <p className="text-xs text-gray-400 dark:text-gray-500">{monthLabel}</p>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* Balance summary */}
      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <DashboardError onRetry={() => fetchPeriodData(period)} />
      ) : data.accounts.length === 0 && data.recentTransactions.length === 0 ? (
        <OnboardingEmpty />
      ) : (
        <>
          <BalanceSummary
            totalBalance={data.totalBalance}
            periodSummary={data.periodSummary}
            periodLabel={periodLabel}
          />

          <RecentTransactions transactions={data.recentTransactions} />

          <AccountsOverview accounts={data.accounts} />

          <CategorySpending data={data.categorySpending} periodLabel={periodLabel} />
        </>
      )}
    </div>
  )
}
