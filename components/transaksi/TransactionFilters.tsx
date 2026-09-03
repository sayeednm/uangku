'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import type { AccountRow } from '@/lib/rekening/queries'

interface TransactionFiltersProps {
  accounts: Pick<AccountRow, 'id' | 'name'>[]
  categories?: { id: string; name: string; type: string }[]
}

const PERIOD_PRESETS = [
  { label: 'Hari ini',   days: 0 },
  { label: 'Minggu ini', days: 7 },
  { label: 'Bulan ini',  days: 30 },
  { label: 'Kustom',     days: -1 },
]

function toLocalISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function TransactionFilters({ accounts, categories = [] }: TransactionFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [showCustom, setShowCustom] = useState(
    !!(searchParams.get('date_from') || searchParams.get('date_to'))
  )

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const applyPreset = (days: number) => {
    if (days === -1) {
      setShowCustom(true)
      return
    }
    setShowCustom(false)
    const params = new URLSearchParams(searchParams.toString())
    const today = toLocalISO(new Date())
    const past = new Date()
    past.setDate(past.getDate() - days)
    params.set('date_from', days === 0 ? today : toLocalISO(past))
    params.set('date_to', today)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const clearAll = () => {
    setShowCustom(false)
    router.push(pathname)
  }

  const hasDateFilter = searchParams.has('date_from') || searchParams.has('date_to')
  const hasFilters = searchParams.has('type') || searchParams.has('account_id') || hasDateFilter || searchParams.has('search')

  const selectClass = `
    appearance-none w-full px-3.5 py-2.5 rounded-xl text-sm font-medium
    bg-white dark:bg-white/[0.07]
    border border-gray-200 dark:border-white/[0.1]
    text-gray-700 dark:text-gray-200
    focus:outline-none focus:ring-2 focus:ring-[#1d6af5]/30 focus:border-[#1d6af5]/50
    transition-all duration-150 cursor-pointer
  `

  return (
    <div className="space-y-3">
      {/* Search */}
      <input
        type="text"
        placeholder="Cari keterangan atau catatan..."
        defaultValue={searchParams.get('search') ?? ''}
        onChange={e => updateParam('search', e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl text-sm
          bg-white dark:bg-white/[0.07]
          border border-gray-200 dark:border-white/[0.1]
          text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-[#1d6af5]/30 focus:border-[#1d6af5]/50
          transition-all duration-150"
      />

      {/* Type + Account + Category */}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={searchParams.get('type') ?? ''}
          onChange={e => updateParam('type', e.target.value)}
          className={selectClass}
          aria-label="Filter jenis"
        >
          <option value="">Semua jenis</option>
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
        </select>

        <select
          value={searchParams.get('account_id') ?? ''}
          onChange={e => updateParam('account_id', e.target.value)}
          className={selectClass}
          aria-label="Filter rekening"
        >
          <option value="">Semua rekening</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        {categories.length > 0 && (
          <select
            value={searchParams.get('category_id') ?? ''}
            onChange={e => updateParam('category_id', e.target.value)}
            className={`${selectClass} col-span-2`}
            aria-label="Filter kategori"
          >
            <option value="">Semua kategori</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Period presets */}
      <div className="flex gap-2 flex-wrap">
        {PERIOD_PRESETS.map(p => {
          const isCustomActive = p.days === -1 && showCustom
          return (
            <button
              key={p.label}
              onClick={() => applyPreset(p.days)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isCustomActive
                  ? 'bg-[#1d6af5] text-white shadow-sm'
                  : 'bg-white dark:bg-white/[0.07] border border-gray-200 dark:border-white/[0.1] text-gray-600 dark:text-gray-300 hover:border-[#1d6af5]/50 hover:text-[#1d6af5]'
              }`}
            >
              {p.label}
            </button>
          )
        })}

        {hasFilters && (
          <button
            onClick={clearAll}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            ✕ Reset
          </button>
        )}
      </div>

      {/* Custom date range — only shown when "Kustom" selected */}
      {showCustom && (
        <div className="grid grid-cols-2 gap-2 animate-fade-up">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Dari</p>
            <input
              type="date"
              value={searchParams.get('date_from') ?? ''}
              onChange={e => updateParam('date_from', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm
                bg-white dark:bg-white/[0.07]
                border border-gray-200 dark:border-white/[0.1]
                text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-[#1d6af5]/30 focus:border-[#1d6af5]/50
                [color-scheme:light] dark:[color-scheme:dark] transition-all duration-150"
              aria-label="Dari tanggal"
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Sampai</p>
            <input
              type="date"
              value={searchParams.get('date_to') ?? ''}
              onChange={e => updateParam('date_to', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm
                bg-white dark:bg-white/[0.07]
                border border-gray-200 dark:border-white/[0.1]
                text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-[#1d6af5]/30 focus:border-[#1d6af5]/50
                [color-scheme:light] dark:[color-scheme:dark] transition-all duration-150"
              aria-label="Sampai tanggal"
            />
          </div>
        </div>
      )}
    </div>
  )
}
