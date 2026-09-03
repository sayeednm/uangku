/**
 * Laporan (Report) queries — server client, RLS enforced.
 */

import { createClient } from '@/lib/supabase/server'

export interface ReportSummary {
  income: number
  expense: number
  net: number
}

export interface CategoryBreakdown {
  category_id: string
  category_name: string
  category_icon: string | null
  total: number
  percentage: number
}

export interface DailyTrend {
  date: string
  income: number
  expense: number
}

export interface ReportData {
  summary: ReportSummary
  expenseByCategory: CategoryBreakdown[]
  incomeByCategory: CategoryBreakdown[]
  dailyTrend: DailyTrend[]
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getReportData(startDate: string, endDate: string): Promise<ReportData> {
  const supabase = await createClient()

  // Fetch all transactions in range
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      type, amount, transaction_date,
      category:categories ( id, name, icon )
    `)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date', { ascending: true })

  if (error) throw error
  const txs = transactions ?? []

  // Summary
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }

  // Expense by category
  type CatShape = { id: string; name: string; icon: string | null }
  const expenseCatMap = new Map<string, { name: string; icon: string | null; total: number }>()
  const incomeCatMap = new Map<string, { name: string; icon: string | null; total: number }>()

  for (const t of txs) {
    const cat = t.category as unknown as CatShape | null
    if (!cat) continue
    if (t.type === 'expense') {
      const existing = expenseCatMap.get(cat.id)
      if (existing) existing.total += t.amount
      else expenseCatMap.set(cat.id, { name: cat.name, icon: cat.icon, total: t.amount })
    } else {
      const existing = incomeCatMap.get(cat.id)
      if (existing) existing.total += t.amount
      else incomeCatMap.set(cat.id, { name: cat.name, icon: cat.icon, total: t.amount })
    }
  }

  const toBreakdown = (map: Map<string, { name: string; icon: string | null; total: number }>, totalSum: number): CategoryBreakdown[] =>
    Array.from(map.entries())
      .map(([id, v]) => ({
        category_id: id,
        category_name: v.name,
        category_icon: v.icon,
        total: v.total,
        percentage: totalSum > 0 ? Math.round((v.total / totalSum) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)

  // Daily trend
  const dailyMap = new Map<string, { income: number; expense: number }>()
  for (const t of txs) {
    const d = t.transaction_date
    const existing = dailyMap.get(d) ?? { income: 0, expense: 0 }
    if (t.type === 'income') existing.income += t.amount
    else existing.expense += t.amount
    dailyMap.set(d, existing)
  }

  const dailyTrend: DailyTrend[] = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    summary: { income, expense, net: income - expense },
    expenseByCategory: toBreakdown(expenseCatMap, expense),
    incomeByCategory: toBreakdown(incomeCatMap, income),
    dailyTrend,
  }
}
