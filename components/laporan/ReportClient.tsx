'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { getPeriodRange, PERIOD_OPTIONS, type PeriodKey } from '@/lib/utils/date'
import { formatCurrency } from '@/lib/utils/currency'
import PeriodSelector from '@/components/dashboard/PeriodSelector'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'
import type { ReportData, CategoryBreakdown, DailyTrend } from '@/lib/laporan/queries'

interface ReportClientProps {
  initialPeriod: PeriodKey
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: ReportData['summary'] }) {
  const isPositive = summary.net >= 0
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Pemasukan</p>
        </div>
        <p className="text-xl font-bold text-emerald-500 tabular-nums">
          {formatCurrency(summary.income)}
        </p>
      </div>

      <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Pengeluaran</p>
        </div>
        <p className="text-xl font-bold text-red-500 tabular-nums">
          {formatCurrency(summary.expense)}
        </p>
      </div>

      <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-gray-400' : 'bg-red-400'}`} />
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Selisih</p>
        </div>
        <p className={`text-xl font-bold tabular-nums ${isPositive ? 'text-gray-900 dark:text-gray-100' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{formatCurrency(summary.net)}
        </p>
      </div>
    </div>
  )
}

// ─── Category Breakdown ───────────────────────────────────────────────────────

function CategoryBreakdownSection({ title, data }: { title: string; data: CategoryBreakdown[] }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
        {title}
      </h2>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          Tidak ada data untuk periode ini
        </p>
      ) : (
        <div className="space-y-3">
          {data.map(row => (
            <div key={row.category_id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{row.category_icon ?? '📦'}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{row.category_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{row.percentage}%</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums w-28 text-right">
                    {formatCurrency(row.total)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${row.percentage}%`,
                    background: 'linear-gradient(90deg, #1d6af5, #3b82f6)',
                    boxShadow: '0 0 6px rgba(29,106,245,0.4)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Trend Chart ──────────────────────────────────────────────────────────────

function TrendSection({ data, isDark }: { data: DailyTrend[]; isDark: boolean }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1)
  const CHART_H = 72
  const barW = `${Math.max(100 / Math.max(data.length, 7), 4)}%`

  const bgColor = isDark ? '#111827' : '#f9fafb'
  const borderColor = isDark ? '#1f2937' : '#f3f4f6'
  const labelColor = isDark ? '#4b5563' : '#9ca3af'
  const emptyColor = isDark ? '#1f2937' : '#e5e7eb'

  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
        Tren Harian
      </h2>
      <div style={{
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        backgroundColor: bgColor,
        padding: 16,
      }}>
        {/* Bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', height: CHART_H, gap: 3 }}>
          {data.map(d => {
            const incH = d.income > 0 ? Math.max(Math.round((d.income / maxVal) * CHART_H), 6) : 0
            const expH = d.expense > 0 ? Math.max(Math.round((d.expense / maxVal) * CHART_H), 6) : 0
            return (
              <div key={d.date} style={{ flex: '0 0 auto', width: barW, height: CHART_H, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 1 }}
                title={`${d.date} · Masuk: ${formatCurrency(d.income)} · Keluar: ${formatCurrency(d.expense)}`}>
                {incH > 0 && <div style={{ width: '45%', height: incH, backgroundColor: '#34d399', borderRadius: '3px 3px 0 0' }} />}
                {expH > 0 && <div style={{ width: '45%', height: expH, backgroundColor: '#f87171', borderRadius: '3px 3px 0 0' }} />}
                {incH === 0 && expH === 0 && <div style={{ width: '45%', height: 2, backgroundColor: emptyColor }} />}
              </div>
            )
          })}
        </div>

        {/* Date labels */}
        <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
          {data.map(d => (
            <div key={d.date} style={{ flex: '0 0 auto', width: barW, textAlign: 'center' }}>
              <span style={{ fontSize: 10, color: labelColor }}>
                {parseInt(d.date.split('-')[2], 10)}
              </span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 8, backgroundColor: '#34d399', borderRadius: 2 }} />
            <span style={{ fontSize: 12, color: labelColor }}>Pemasukan</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 8, backgroundColor: '#f87171', borderRadius: 2 }} />
            <span style={{ fontSize: 12, color: labelColor }}>Pengeluaran</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchReportData(period: PeriodKey): Promise<ReportData> {
  const supabase = createClient()
  const { start, end } = getPeriodRange(period)

  const { data: txs, error } = await supabase
    .from('transactions')
    .select('type, amount, transaction_date, category:categories(id, name, icon)')
    .gte('transaction_date', start)
    .lte('transaction_date', end)
    .order('transaction_date', { ascending: true })

  if (error) throw error

  let income = 0, expense = 0
  type CatShape = { id: string; name: string; icon: string | null }
  const expCat = new Map<string, { name: string; icon: string | null; total: number }>()
  const incCat = new Map<string, { name: string; icon: string | null; total: number }>()
  const dailyMap = new Map<string, { income: number; expense: number }>()

  for (const t of txs ?? []) {
    const cat = t.category as unknown as CatShape | null
    const isInc = t.type === 'income'
    if (isInc) income += t.amount; else expense += t.amount
    if (cat) {
      const m = isInc ? incCat : expCat
      const ex = m.get(cat.id)
      if (ex) ex.total += t.amount
      else m.set(cat.id, { name: cat.name, icon: cat.icon, total: t.amount })
    }
    const ex = dailyMap.get(t.transaction_date) ?? { income: 0, expense: 0 }
    if (isInc) ex.income += t.amount; else ex.expense += t.amount
    dailyMap.set(t.transaction_date, ex)
  }

  const toBreakdown = (map: typeof expCat, sum: number): CategoryBreakdown[] =>
    Array.from(map.entries())
      .map(([id, v]) => ({ category_id: id, category_name: v.name, category_icon: v.icon, total: v.total, percentage: sum > 0 ? Math.round((v.total / sum) * 100) : 0 }))
      .sort((a, b) => b.total - a.total)

  return {
    summary: { income, expense, net: income - expense },
    expenseByCategory: toBreakdown(expCat, expense),
    incomeByCategory: toBreakdown(incCat, income),
    dailyTrend: Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ReportClient({ initialPeriod }: ReportClientProps) {
  const [period, setPeriod] = useState<PeriodKey>(initialPeriod)
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const load = useCallback(async (p: PeriodKey) => {
    setLoading(true)
    setError(false)
    try { setData(await fetchReportData(p)) }
    catch { setError(true) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(period) }, [period, load])

  const isEmpty = !data || (data.summary.income === 0 && data.summary.expense === 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Laporan</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {PERIOD_OPTIONS.find(p => p.key === period)?.label}
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Gagal memuat data</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Coba muat ulang halaman.</p>
          <button onClick={() => load(period)} className="btn-primary mt-4 text-sm">Coba Lagi</button>
        </div>
      ) : isEmpty ? (
        <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Belum ada transaksi</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Tidak ada data untuk {PERIOD_OPTIONS.find(p => p.key === period)?.label?.toLowerCase()}.
          </p>
        </div>
      ) : (
        <>
          <SummaryCards summary={data!.summary} />
          {data!.dailyTrend.length > 0 && <TrendSection data={data!.dailyTrend} isDark={isDark} />}
          <CategoryBreakdownSection title="Pengeluaran per Kategori" data={data!.expenseByCategory} />
          <CategoryBreakdownSection title="Pemasukan per Kategori" data={data!.incomeByCategory} />
        </>
      )}
    </div>
  )
}
