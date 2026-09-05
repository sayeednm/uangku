'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import OnboardingTour from './OnboardingTour'
import type { DashboardData } from '@/lib/dashboard/queries'

interface DashboardClientProps {
  initialData: DashboardData
  initialPeriod: PeriodKey
}

export default function DashboardClient({ initialData, initialPeriod }: DashboardClientProps) {
  const [period, setPeriod] = useState<PeriodKey>(initialPeriod)
  const [data, setData] = useState<DashboardData>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const mounted = useRef(false)
  const realtimeReady = useRef(false)

  // Fetch only period-sensitive data on period change
  const fetchPeriodData = useCallback(async (p: PeriodKey) => {
    setLoading(true)
    setError(false)
    try {
      const supabase = createClient()
      const { start, end } = getPeriodRange(p)

      const [txRes, catRes] = await Promise.all([
        supabase.from('transactions').select('type, amount')
          .gte('transaction_date', start).lte('transaction_date', end),
        supabase.from('transactions').select('amount, category:categories(id,name,icon,color)')
          .eq('type', 'expense').gte('transaction_date', start).lte('transaction_date', end),
      ])

      if (txRes.error) throw txRes.error

      let income = 0, expense = 0
      for (const r of txRes.data ?? []) {
        if (r.type === 'income') income += r.amount
        else expense += r.amount
      }

      type CatShape = { id: string; name: string; icon: string | null; color: string | null }
      const catMap = new Map<string, { category_id: string; category_name: string; category_icon: string | null; category_color: string | null; total: number }>()
      for (const row of catRes.data ?? []) {
        const cat = row.category as unknown as CatShape | null
        if (!cat) continue
        const ex = catMap.get(cat.id)
        if (ex) ex.total += row.amount
        else catMap.set(cat.id, { category_id: cat.id, category_name: cat.name, category_icon: cat.icon, category_color: cat.color, total: row.amount })
      }

      setData(prev => ({
        ...prev,
        periodSummary: { income, expense },
        categorySpending: Array.from(catMap.values()).sort((a, b) => b.total - a.total).slice(0, 6),
      }))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Period change — skip on mount (initialData already has correct period data)
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    fetchPeriodData(period)
  }, [period, fetchPeriodData])

  // Realtime — only refresh after a short delay to avoid double-load on navigation
  useEffect(() => {
    const supabase = createClient()

    // Delay realtime subscription so it doesn't fire immediately on mount
    const setupTimer = setTimeout(() => {
      realtimeReady.current = true

      const channel = supabase
        .channel('dashboard-rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' },
          async () => {
            if (!realtimeReady.current) return
            try {
              const { start, end } = getPeriodRange(period)
              const supabase2 = createClient()
              const [accRes, recentRes, periodRes] = await Promise.all([
                supabase2.from('accounts').select('*').eq('is_archived', false).order('created_at', { ascending: true }),
                supabase2.from('transactions').select('*, category:categories(id,name,icon,color,type), account:accounts(id,name,type)').order('transaction_date', { ascending: false }).order('created_at', { ascending: false }).limit(10),
                supabase2.from('transactions').select('type, amount').gte('transaction_date', start).lte('transaction_date', end),
              ])

              if (!accRes.data) return

              const ids = accRes.data.map(a => a.id)
              const [txRes, tfOutRes, tfInRes] = await Promise.all([
                supabase2.from('transactions').select('account_id, type, amount').in('account_id', ids),
                supabase2.from('transfers').select('from_account_id, amount').in('from_account_id', ids),
                supabase2.from('transfers').select('to_account_id, amount').in('to_account_id', ids),
              ])

              const incMap = new Map<string, number>()
              const expMap = new Map<string, number>()
              const tfInMap = new Map<string, number>()
              const tfOutMap = new Map<string, number>()

              for (const t of txRes.data ?? []) {
                if (t.type === 'income') incMap.set(t.account_id, (incMap.get(t.account_id) ?? 0) + t.amount)
                else expMap.set(t.account_id, (expMap.get(t.account_id) ?? 0) + t.amount)
              }
              for (const t of tfInRes.data ?? []) tfInMap.set(t.to_account_id, (tfInMap.get(t.to_account_id) ?? 0) + t.amount)
              for (const t of tfOutRes.data ?? []) tfOutMap.set(t.from_account_id, (tfOutMap.get(t.from_account_id) ?? 0) + t.amount)

              const accounts = accRes.data.map(a => ({
                ...a,
                current_balance: a.initial_balance + (incMap.get(a.id) ?? 0) - (expMap.get(a.id) ?? 0) + (tfInMap.get(a.id) ?? 0) - (tfOutMap.get(a.id) ?? 0),
              }))

              let pIncome = 0, pExpense = 0
              for (const r of periodRes.data ?? []) {
                if (r.type === 'income') pIncome += r.amount
                else pExpense += r.amount
              }

              setData(prev => ({
                ...prev,
                accounts,
                totalBalance: accounts.reduce((s, a) => s + a.current_balance, 0),
                recentTransactions: (recentRes.data ?? []) as typeof prev.recentTransactions,
                periodSummary: { income: pIncome, expense: pExpense },
              }))
            } catch { /* silent */ }
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }, 1500) // Wait 1.5s before setting up realtime — avoids double fetch on navigation

    return () => {
      clearTimeout(setupTimer)
      realtimeReady.current = false
    }
  }, [period]) // eslint-disable-line react-hooks/exhaustive-deps

  const periodLabel = getPeriodRange(period).label
  const monthLabel = getCurrentMonthLabel()

  return (
    <div className="space-y-10">
      <div className="animate-fade-up mb-4">
        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium tracking-wide">
          Selamat datang kembali 👋
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mt-0.5">
          Ringkasan
        </h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{monthLabel}</p>
        <div className="mt-3">
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <DashboardError onRetry={() => fetchPeriodData(period)} />
      ) : data.accounts.length === 0 && data.recentTransactions.length === 0 ? (
        <OnboardingEmpty />
      ) : (
        <>
          <BalanceSummary totalBalance={data.totalBalance} periodSummary={data.periodSummary} periodLabel={periodLabel} />
          <RecentTransactions transactions={data.recentTransactions} />
          <AccountsOverview accounts={data.accounts} />
          <CategorySpending data={data.categorySpending} periodLabel={periodLabel} />
          <OnboardingTour />
        </>
      )}
    </div>
  )
}
