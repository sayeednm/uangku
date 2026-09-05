import Link from 'next/link'
import TransactionRow from './TransactionRow'
import EmptyState from './EmptyState'
import type { TransactionWithCategory } from '@/lib/dashboard/queries'

interface RecentTransactionsProps {
  transactions: TransactionWithCategory[]
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <section aria-labelledby="recent-tx-heading" className="animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <h2
          id="recent-tx-heading"
          className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest"
        >
          Transaksi Terbaru
        </h2>
        {transactions.length > 0 && (
          <Link
            href="/transaksi"
            className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Lihat Semua →
          </Link>
        )}
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          title="Belum ada transaksi"
          description="Catat pemasukan atau pengeluaran untuk mulai melihat kondisi keuangan Anda."
          action={{ label: '+ Tambah Transaksi', href: '/transaksi/baru' }}
        />
      ) : (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.07] rounded-2xl px-4 divide-y divide-gray-100 dark:divide-white/[0.05]">
          {transactions.map(tx => (
            <TransactionRow key={tx.id} transaction={tx} />
          ))}
          {/* Mobile-friendly "Lihat Semua" button */}
          <div className="py-3 text-center">
            <a
              href="/transaksi"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1d6af5] hover:opacity-80 transition-opacity"
            >
              Lihat semua transaksi
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </section>
  )
}
