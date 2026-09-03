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
        </div>
      )}
    </section>
  )
}
