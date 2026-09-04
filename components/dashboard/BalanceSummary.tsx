import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/currency'
import type { PeriodSummary } from '@/lib/dashboard/queries'

interface BalanceSummaryProps {
  totalBalance: number
  periodSummary: PeriodSummary
  periodLabel: string
}

export default function BalanceSummary({ totalBalance, periodSummary, periodLabel }: BalanceSummaryProps) {
  const net = periodSummary.income - periodSummary.expense
  const isPositive = net >= 0

  return (
    <div className="space-y-3 animate-fade-up">
      {/* Hero — clickable to /rekening */}
      <Link
        href="/rekening"
        className="block relative overflow-hidden rounded-2xl px-6 py-6 active:scale-[0.98] transition-transform duration-150"
        style={{
          background: 'linear-gradient(135deg, #1040a8 0%, #1d6af5 50%, #3b82f6 100%)',
          boxShadow: '0 8px 32px rgba(29,106,245,0.35)',
        }}
      >
        <div aria-hidden="true" className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/[0.08]" />
        <div aria-hidden="true" className="absolute -bottom-6 right-8 w-24 h-24 rounded-full bg-white/[0.05]" />

        <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest mb-2">
          Total Saldo
        </p>
        <p className="text-[2.6rem] font-bold text-white tabular-nums leading-none tracking-tight animate-count-up">
          {formatCurrency(totalBalance)}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.12]">
            <span className={`text-xs font-semibold ${isPositive ? 'text-white' : 'text-red-300'}`}>
              {isPositive ? '↑' : '↓'} {formatCurrency(Math.abs(net))}
            </span>
            <span className="text-[10px] text-white/50">{periodLabel}</span>
          </div>
          <div className="flex items-center gap-1 text-white/50">
            <span className="text-[10px]">Lihat rekening</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>

      {/* Income / Expense */}
      <div className="grid grid-cols-2 gap-3 stagger">
        <div className="animate-fade-up bg-white dark:bg-white/[0.05] border border-gray-200/60 dark:border-white/[0.08] rounded-2xl px-4 py-3.5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Masuk</p>
          </div>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
            {formatCurrency(periodSummary.income)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">{periodLabel}</p>
        </div>

        <div className="animate-fade-up bg-white dark:bg-white/[0.05] border border-gray-200/60 dark:border-white/[0.08] rounded-2xl px-4 py-3.5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
              <svg className="w-3 h-3 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Keluar</p>
          </div>
          <p className="text-lg font-bold text-red-500 dark:text-red-400 tabular-nums leading-none">
            {formatCurrency(periodSummary.expense)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">{periodLabel}</p>
        </div>
      </div>
    </div>
  )
}
