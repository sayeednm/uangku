'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/currency'

interface TxRow {
  type: string
  amount: number
  transaction_date: string
  description: string | null
  category: { name?: string; icon?: string | null } | null
}

interface DayAgg {
  income: number
  expense: number
}

const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const toISO = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Compact amount for tiny calendar cells: 1.2jt / 250k
const shortAmount = (n: number) => {
  if (n >= 1_000_000) {
    const v = n / 1_000_000
    return `${v.toFixed(Math.abs(v % 1) < 0.05 ? 0 : 1).replace('.', ',')}jt`
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}

const monthLabel = (y: number, m: number) =>
  new Date(y, m, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

export default function CalendarView() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-based
  const [rows, setRows] = useState<TxRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const monthStart = useMemo(() => `${year}-${String(month + 1).padStart(2, '0')}-01`, [year, month])
  const monthEnd = useMemo(() => {
    const last = new Date(year, month + 1, 0)
    return toISO(last)
  }, [year, month])

  // ── Data fetch (month range) ──────────────────────────────────────────────

  const load = useCallback(async (from: string, to: string) => {
    setLoading(true)
    setError(false)
    try {
      const supabase = createClient()
      const { data, error: dbError } = await supabase
        .from('transactions')
        .select('type, amount, transaction_date, description, category:categories(name, icon)')
        .gte('transaction_date', from)
        .lte('transaction_date', to)
        .order('transaction_date', { ascending: true })

      if (dbError) throw dbError
      setRows((data ?? []) as unknown as TxRow[])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(monthStart, monthEnd) }, [monthStart, monthEnd, load])

  // Preselect today when viewing the current month
  useEffect(() => {
    if (month === now.getMonth() && year === now.getFullYear()) setSelectedDay(toISO(now))
    else setSelectedDay(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute only when the viewed month changes
  }, [month, year])

  // ── Aggregates ─────────────────────────────────────────────────────────────

  const { daily, totals } = useMemo(() => {
    const dailyMap = new Map<string, DayAgg>()
    let income = 0, expense = 0
    for (const t of rows ?? []) {
      const isInc = t.type === 'income'
      if (isInc) income += t.amount; else expense += t.amount
      const agg = dailyMap.get(t.transaction_date) ?? { income: 0, expense: 0 }
      if (isInc) agg.income += t.amount; else agg.expense += t.amount
      dailyMap.set(t.transaction_date, agg)
    }
    return { daily: dailyMap, totals: { income, expense } }
  }, [rows])

  const net = totals.income - totals.expense
  const savingRate = totals.income > 0 ? Math.round(((totals.income - totals.expense) / totals.income) * 100) : 0

  // Selected day transactions (latest first)
  const dayItems = useMemo(
    () => (rows ?? []).filter(r => r.transaction_date === selectedDay).reverse(),
    [rows, selectedDay]
  )

  // ── Grid building (Monday-first) ──────────────────────────────────────────

  const cells = useMemo(() => {
    const first = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const lead = (first.getDay() + 6) % 7 // Monday = 0
    const out: { day: number | null }[] = []
    for (let i = 0; i < lead; i++) out.push({ day: null })
    for (let d = 1; d <= daysInMonth; d++) out.push({ day: d })
    while (out.length % 7 !== 0) out.push({ day: null })
    return out
  }, [year, month])

  const todayISOStr = toISO(new Date())

  const prevMonth = () => {
    setMonth(m => { if (m === 0) { setYear(y => y - 1); return 11 } return m - 1 })
  }
  const nextMonth = () => {
    setMonth(m => { if (m === 11) { setYear(y => y + 1); return 0 } return m + 1 })
  }

  const selDayItemsIncome = dayItems.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const selDayItemsExpense = dayItems.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)

  return (
    <div className="space-y-4">
      {/* Month totals — the “progress” summary */}
      <div className="bg-white dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.08] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
              Progres {monthLabel(year, month)}
            </p>
            <p className={`text-xl font-bold tabular-nums ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              {net >= 0 ? '+' : ''}{formatCurrency(net)}
            </p>
          </div>
          {totals.income > 0 && (
            <div className="text-right">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Tabungan</p>
              <span className={`text-sm font-bold ${savingRate >= 0 ? 'text-[#1d6af5]' : 'text-red-500'}`}>{savingRate}%</span>
            </div>
          )}
        </div>
        {/* Mini stacked bar: green income share vs red expense */}
        <div className="h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${totals.income + totals.expense > 0 ? Math.round((totals.income / (totals.income + totals.expense)) * 100) : 0}%` }}
            title={`Pemasukan ${formatCurrency(totals.income)}`}
          />
          <div
            className="h-full bg-red-500 transition-all duration-700"
            style={{ width: `${totals.income + totals.expense > 0 ? Math.round((totals.expense / (totals.income + totals.expense)) * 100) : 0}%` }}
            title={`Pengeluaran ${formatCurrency(totals.expense)}`}
          />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Masuk {formatCurrency(totals.income)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Keluar {formatCurrency(totals.expense)}</span>
          </div>
        </div>
      </div>

      {/* Calendar card */}
      <div className="bg-white dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.08] rounded-2xl p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Bulan sebelumnya"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400
              bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.12] active:scale-90 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{monthLabel(year, month)}</p>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="Bulan berikutnya"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400
              bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.12] active:scale-90 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_LABELS.map(w => (
            <div key={w} className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Day grid */}
        {loading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl skeleton" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Gagal memuat kalender</p>
            <button onClick={() => load(monthStart, monthEnd)} className="btn-secondary text-xs px-3 py-2">Coba Lagi</button>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (c.day === null) return <div key={i} aria-hidden="true" />
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`
              const agg = daily.get(dateStr)
              const selected = selectedDay === dateStr
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDay(selected ? null : dateStr)}
                  aria-pressed={selected}
                  className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-center gap-0.5 transition-all
                    active:scale-90
                    ${selected
                      ? 'bg-[#1d6af5]/15 ring-2 ring-[#1d6af5]'
                      : agg
                        ? 'bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.12]'
                        : 'hover:bg-gray-100 dark:hover:bg-white/[0.04]'}`}
                >
                  <span className={`text-[11px] font-semibold leading-none
                    ${dateStr === todayISOStr ? 'inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-[#1d6af5] text-white' : 'text-gray-700 dark:text-gray-300'}`}
                    style={dateStr === todayISOStr ? { width: 18, height: 18, borderRadius: 9999 } : undefined}
                  >
                    {c.day}
                  </span>
                  {agg && agg.expense > 0 && (
                    <span className="text-[9px] leading-none font-semibold text-red-500 tabular-nums">
                      {shortAmount(agg.expense)}
                    </span>
                  )}
                  {agg && agg.income > 0 && (
                    <span className="text-[9px] leading-none font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {agg.income > 0 ? '+' : ''}{shortAmount(agg.income)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected-day detail */}
      {selectedDay && !loading && (
        <div className="bg-white dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.08] rounded-2xl p-4 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              {parseInt(selectedDay.split('-')[2], 10)} {new Date(year, month, 1).toLocaleDateString('id-ID', { month: 'short' })}
            </h3>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              {selDayItemsIncome > 0 && <span className="text-emerald-600 dark:text-emerald-400">+{formatCurrency(selDayItemsIncome)}</span>}
              {selDayItemsExpense > 0 && <span className="text-red-500">-{formatCurrency(selDayItemsExpense)}</span>}
            </div>
          </div>
          {dayItems.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">Tidak ada transaksi di tanggal ini</p>
          ) : (
            <div className="space-y-2.5">
              {dayItems.map((t, i) => {
                const isInc = t.type === 'income'
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-base leading-none w-6 text-center shrink-0">
                      {t.category?.icon ?? (isInc ? '💰' : '🧾')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-800 dark:text-gray-100 truncate">
                        {t.description || t.category?.name || (isInc ? 'Pemasukan' : 'Pengeluaran')}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">{t.category?.name ?? (isInc ? 'Pemasukan' : 'Pengeluaran')}</p>
                    </div>
                    <span className={`text-[13px] font-bold tabular-nums shrink-0 ${isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-100'}`}>
                      {isInc ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
