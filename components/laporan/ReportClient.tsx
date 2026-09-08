'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { getPeriodRange, PERIOD_OPTIONS, type PeriodKey } from '@/lib/utils/date'
import { formatCurrency } from '@/lib/utils/currency'
import PeriodSelector from '@/components/dashboard/PeriodSelector'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'
import DonutChart from './DonutChart'
import type { ReportData, DailyTrend } from '@/lib/laporan/queries'

interface ReportClientProps {
  initialPeriod: PeriodKey
}

// Warna kategori konsisten
const CATEGORY_COLORS: Record<string, string> = {
  'Makanan': '#ef4444', 'Transportasi': '#3b82f6', 'Belanja': '#8b5cf6',
  'Tagihan': '#f59e0b', 'Rumah': '#10b981', 'Kesehatan': '#ec4899',
  'Hiburan': '#6366f1', 'Pendidikan': '#14b8a6', 'Pakaian': '#f97316',
  'Keluarga': '#a855f7', 'Gaji': '#10b981', 'Freelance': '#3b82f6',
  'Bonus': '#f59e0b', 'Investasi': '#8b5cf6', 'Hadiah': '#ec4899',
  'Lainnya': '#6b7280',
}

const FALLBACK_COLORS = [
  '#1d6af5', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#a855f7',
]

function getColor(name: string, index: number): string {
  return CATEGORY_COLORS[name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]
}

// ─── Summary hero ─────────────────────────────────────────────────────────────

function SummaryHero({ summary }: { summary: ReportData['summary'] }) {
  const isPositive = summary.net >= 0
  const savingRate = summary.income > 0
    ? Math.round(((summary.income - summary.expense) / summary.income) * 100)
    : 0

  return (
    <div className="space-y-3">
      {/* Main cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pemasukan */}
        <div className="rounded-2xl p-4 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
          <div aria-hidden="true" className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
            <p className="text-[10px] font-semibold text-white/70 uppercase tracking-wide">Pemasukan</p>
          </div>
          <p className="text-lg font-bold text-white tabular-nums leading-none">
            {formatCurrency(summary.income)}
          </p>
        </div>

        {/* Pengeluaran */}
        <div className="rounded-2xl p-4 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }}>
          <div aria-hidden="true" className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <p className="text-[10px] font-semibold text-white/70 uppercase tracking-wide">Pengeluaran</p>
          </div>
          <p className="text-lg font-bold text-white tabular-nums leading-none">
            {formatCurrency(summary.expense)}
          </p>
        </div>
      </div>

      {/* Selisih + saving rate */}
      <div className="bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.08] rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Selisih</p>
          <p className={`text-2xl font-bold tabular-nums ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{formatCurrency(summary.net)}
          </p>
        </div>
        {summary.income > 0 && (
          <div className="text-right">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Tabungan</p>
            <div className="flex items-center gap-1.5 justify-end">
              <div className="w-16 h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max(0, Math.min(savingRate, 100))}%`,
                    background: savingRate >= 0 ? 'linear-gradient(90deg, #1d6af5, #3b82f6)' : '#ef4444',
                  }}
                />
              </div>
              <span className={`text-sm font-bold ${savingRate >= 0 ? 'text-[#1d6af5]' : 'text-red-500'}`}>
                {savingRate}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Trend chart ──────────────────────────────────────────────────────────────

function TrendChart({ data, isDark }: { data: DailyTrend[]; isDark: boolean }) {
  if (data.length === 0) return null

  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1)
  const CHART_H = 80
  const barW = `${Math.max(100 / Math.max(data.length, 7), 4)}%`
  const bgColor = isDark ? '#0f172a' : '#f8fafc'
  const borderColor = isDark ? '#1e293b' : '#f1f5f9'
  const labelColor = isDark ? '#475569' : '#94a3b8'

  return (
    <div>
      <h2 className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
        Tren Harian
      </h2>
      <div style={{ border: `1px solid ${borderColor}`, borderRadius: 16, backgroundColor: bgColor, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: CHART_H, gap: 3 }}>
          {data.map(d => {
            const incH = d.income > 0 ? Math.max(Math.round((d.income / maxVal) * CHART_H), 4) : 0
            const expH = d.expense > 0 ? Math.max(Math.round((d.expense / maxVal) * CHART_H), 4) : 0
            return (
              <div key={d.date}
                style={{ flex: '0 0 auto', width: barW, height: CHART_H, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 1 }}
                title={`${d.date}\nMasuk: ${formatCurrency(d.income)}\nKeluar: ${formatCurrency(d.expense)}`}
              >
                {incH > 0 && <div style={{ width: '45%', height: incH, backgroundColor: '#34d399', borderRadius: '3px 3px 0 0' }} />}
                {expH > 0 && <div style={{ width: '45%', height: expH, backgroundColor: '#f87171', borderRadius: '3px 3px 0 0' }} />}
                {incH === 0 && expH === 0 && <div style={{ width: '45%', height: 2, backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }} />}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
          {data.map(d => (
            <div key={d.date} style={{ flex: '0 0 auto', width: barW, textAlign: 'center' }}>
              <span style={{ fontSize: 10, color: labelColor }}>{parseInt(d.date.split('-')[2], 10)}</span>
            </div>
          ))}
        </div>
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

// ─── Data fetch ───────────────────────────────────────────────────────────────

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

  const toBreakdown = (map: typeof expCat, sum: number) =>
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
  const periodLabel = PERIOD_OPTIONS.find(p => p.key === period)?.label ?? ''

  // Build donut segments for expense
  const expenseSegments = (data?.expenseByCategory ?? []).map((row, i) => ({
    label: row.category_name,
    value: row.total,
    color: getColor(row.category_name, i),
    icon: row.category_icon,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Laporan</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{periodLabel}</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Gagal memuat data</p>
          <button onClick={() => load(period)} className="btn-primary mt-4 text-sm">Coba Lagi</button>
        </div>
      ) : isEmpty ? (
        <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Belum ada transaksi</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Tidak ada data untuk {periodLabel.toLowerCase()}.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <SummaryHero summary={data!.summary} />

          {/* Donut chart — pengeluaran per kategori */}
          {expenseSegments.length > 0 && (
            <div className="bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.08] rounded-2xl p-5">
              <h2 className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
                Pengeluaran per Kategori
              </h2>
              <DonutChart
                segments={expenseSegments}
                total={data!.summary.expense}
                centerLabel="Pengeluaran"
              />
            </div>
          )}

          {/* Income breakdown — simple list */}
          {data!.incomeByCategory.length > 0 && (
            <div className="bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.08] rounded-2xl p-5">
              <h2 className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
                Pemasukan per Kategori
              </h2>
              <div className="space-y-3">
                {data!.incomeByCategory.map((row, i) => {
                  const color = getColor(row.category_name, i)
                  return (
                    <div key={row.category_id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{row.category_icon ?? '📦'}</span>
                          <span className="text-[13px] text-gray-700 dark:text-gray-300">{row.category_name}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">{row.percentage}%</span>
                          <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                            {formatCurrency(row.total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${row.percentage}%`, background: `linear-gradient(90deg, ${color}, ${color}99)`, boxShadow: `0 0 6px ${color}40` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Daily trend */}
          {data!.dailyTrend.length > 0 && (
            <TrendChart data={data!.dailyTrend} isDark={isDark} />
          )}
        </>
      )}
    </div>
  )
}
