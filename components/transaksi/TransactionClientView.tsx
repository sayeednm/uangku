'use client'

import { useState, useMemo, useCallback } from 'react'
import { formatDate } from '@/lib/utils/date'
import TransactionItem from './TransactionItem'
import type { TransactionWithRefs } from '@/lib/transaksi/queries'
import Link from 'next/link'

interface Account { id: string; name: string }
interface Category { id: string; name: string; type: string }

interface Props {
  transactions: TransactionWithRefs[]
  accounts: Account[]
  categories: Category[]
}

const PERIOD_PRESETS = [
  { label: 'Hari ini', days: 0 },
  { label: 'Minggu ini', days: 7 },
  { label: 'Bulan ini', days: 30 },
  { label: 'Semua', days: -1 },
]

function toLocalISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function TransactionClientView({ transactions, accounts, categories }: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [activePeriod, setActivePeriod] = useState(3) // index 3 = Semua
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const applyPreset = useCallback((index: number) => {
    const preset = PERIOD_PRESETS[index]
    setActivePeriod(index)
    if (preset.days === -1) {
      // "Semua" or "Kustom"
      if (index === 3) {
        setDateFrom('')
        setDateTo('')
        setShowCustom(false)
      }
      return
    }
    setShowCustom(false)
    const today = toLocalISO(new Date())
    const past = new Date()
    past.setDate(past.getDate() - preset.days)
    setDateFrom(preset.days === 0 ? today : toLocalISO(past))
    setDateTo(today)
  }, [])

  const handleCustom = () => {
    setActivePeriod(-1)
    setShowCustom(true)
  }

  // Filter transactions client-side — instant, no server round-trip
  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (typeFilter && tx.type !== typeFilter) return false
      if (accountFilter && tx.account_id !== accountFilter) return false
      if (categoryFilter && tx.category_id !== categoryFilter) return false
      if (dateFrom && tx.transaction_date < dateFrom) return false
      if (dateTo && tx.transaction_date > dateTo) return false
      if (search) {
        const q = search.toLowerCase()
        const desc = (tx.description ?? '').toLowerCase()
        const note = (tx.note ?? '').toLowerCase()
        const catName = ((tx.category as { name?: string })?.name ?? '').toLowerCase()
        if (!desc.includes(q) && !note.includes(q) && !catName.includes(q)) return false
      }
      return true
    })
  }, [transactions, typeFilter, accountFilter, categoryFilter, dateFrom, dateTo, search])

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, TransactionWithRefs[]>()
    for (const tx of filtered) {
      const key = tx.transaction_date
      const arr = map.get(key) ?? []
      arr.push(tx)
      map.set(key, arr)
    }
    return map
  }, [filtered])

  const hasFilters = typeFilter || accountFilter || categoryFilter || dateFrom || dateTo || search
  const selectClass = `appearance-none w-full px-3.5 py-2.5 rounded-xl text-sm font-medium
    bg-white dark:bg-white/[0.07] border border-gray-200 dark:border-white/[0.1]
    text-gray-700 dark:text-gray-200
    focus:outline-none focus:ring-2 focus:ring-[#1d6af5]/30 focus:border-[#1d6af5]/50
    transition-all duration-150 cursor-pointer`

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        placeholder="Cari keterangan, catatan, atau kategori..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl text-sm
          bg-white dark:bg-white/[0.07] border border-gray-200 dark:border-white/[0.1]
          text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-[#1d6af5]/30 focus:border-[#1d6af5]/50
          transition-all duration-150"
      />

      {/* Type + Account */}
      <div className="grid grid-cols-2 gap-2">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectClass}>
          <option value="">Semua jenis</option>
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
        </select>

        <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} className={selectClass}>
          <option value="">Semua rekening</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        {categories.length > 0 && (
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={`${selectClass} col-span-2`}>
            <option value="">Semua kategori</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Period presets — instant, no router.push */}
      <div className="flex gap-2 flex-wrap">
        {PERIOD_PRESETS.map((p, i) => (
          <button
            key={p.label}
            onClick={() => applyPreset(i)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
              activePeriod === i
                ? 'bg-[#1d6af5] text-white shadow-sm'
                : 'bg-white dark:bg-white/[0.07] border border-gray-200 dark:border-white/[0.1] text-gray-600 dark:text-gray-300 hover:border-[#1d6af5]/50 hover:text-[#1d6af5]'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={handleCustom}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
            activePeriod === -1
              ? 'bg-[#1d6af5] text-white shadow-sm'
              : 'bg-white dark:bg-white/[0.07] border border-gray-200 dark:border-white/[0.1] text-gray-600 dark:text-gray-300 hover:border-[#1d6af5]/50 hover:text-[#1d6af5]'
          }`}
        >
          Kustom
        </button>
        {hasFilters && (
          <button
            onClick={() => {
              setSearch(''); setTypeFilter(''); setAccountFilter('')
              setCategoryFilter(''); setDateFrom(''); setDateTo('')
              setActivePeriod(3); setShowCustom(false)
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            ✕ Reset
          </button>
        )}
      </div>

      {/* Custom date */}
      {showCustom && (
        <div className="grid grid-cols-2 gap-2 animate-fade-up">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Dari</p>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-white dark:bg-white/[0.07] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1d6af5]/30 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Sampai</p>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-white dark:bg-white/[0.07] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1d6af5]/30 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
        </div>
      )}

      {/* Result count */}
      {hasFilters && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {filtered.length} transaksi ditemukan
        </p>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {hasFilters ? 'Tidak ada transaksi' : 'Belum ada transaksi'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
            {hasFilters ? 'Coba ubah atau reset filter.' : 'Gunakan tombol + untuk mencatat transaksi pertama Anda.'}
          </p>
          {!hasFilters && (
            <Link href="/transaksi/baru" className="inline-block mt-4 btn-primary text-sm">
              + Tambah Transaksi
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([date, txs]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                {formatDate(date)}
              </p>
              <div className="bg-white dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.07] rounded-2xl px-4 divide-y divide-gray-100 dark:divide-white/[0.05]">
                {txs.map((tx, i) => (
                  <div key={tx.id} className="animate-fade-up" style={{ animationDelay: `${i * 35}ms` }}>
                    <TransactionItem transaction={tx} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
