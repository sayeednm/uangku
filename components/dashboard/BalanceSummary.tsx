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
      {/* Total Saldo — biru, clickable */}
      <Link
        href="/rekening"
        className="block relative overflow-hidden rounded-2xl px-6 py-6 active:scale-[0.98] transition-transform duration-150"
        style={{
          background: 'linear-gradient(135deg, #1040a8 0%, #1d6af5 55%, #3b82f6 100%)',
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

      {/* Pemasukan + Pengeluaran — masing-masing solid color */}
      <div className="grid grid-cols-2 gap-3 stagger">
        {/* Pemasukan — hijau */}
        <div
          className="animate-fade-up relative overflow-hidden rounded-2xl px-4 py-4"
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
          }}
        >
          <div aria-hidden="true" className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/[0.08]" />
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
            <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wide">Pemasukan</p>
          </div>
          <p className="text-lg font-bold text-white tabular-nums leading-none">
            {formatCurrency(periodSummary.income)}
          </p>
          <p className="text-[10px] text-white/50 mt-1">{periodLabel}</p>
        </div>

        {/* Pengeluaran — merah/coral */}
        <div
          className="animate-fade-up relative overflow-hidden rounded-2xl px-4 py-4"
          style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
            boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
          }}
        >
          <div aria-hidden="true" className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/[0.08]" />
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wide">Pengeluaran</p>
          </div>
          <p className="text-lg font-bold text-white tabular-nums leading-none">
            {formatCurrency(periodSummary.expense)}
          </p>
          <p className="text-[10px] text-white/50 mt-1">{periodLabel}</p>
        </div>
      </div>
    </div>
  )
}
