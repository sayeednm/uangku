import Link from 'next/link'
import TransactionItem from './TransactionItem'
import type { TransactionWithRefs } from '@/lib/transaksi/queries'
import { formatDate } from '@/lib/utils/date'

interface TransactionListProps {
  transactions: TransactionWithRefs[]
  total: number
  page: number
  pageSize: number
}

// Group transactions by date
function groupByDate(transactions: TransactionWithRefs[]): Map<string, TransactionWithRefs[]> {
  const map = new Map<string, TransactionWithRefs[]>()
  for (const tx of transactions) {
    const key = tx.transaction_date
    const existing = map.get(key)
    if (existing) existing.push(tx)
    else map.set(key, [tx])
  }
  return map
}

export default function TransactionList({ transactions, total, page, pageSize }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Belum ada transaksi</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
          Catat pemasukan atau pengeluaran untuk mulai melihat kondisi keuangan Anda.
        </p>
        <Link href="/transaksi/baru" className="inline-block mt-4 btn-primary text-sm">
          + Tambah Transaksi
        </Link>
      </div>
    )
  }

  const grouped = groupByDate(transactions)
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      {/* Grouped list */}
      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([date, txs]) => (
          <div key={date}>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
              {formatDate(date)}
            </p>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {txs.map(tx => (
                <TransactionItem key={tx.id} transaction={tx} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total} transaksi · Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?page=${page - 1}`}
                className="text-sm px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                ← Sebelumnya
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?page=${page + 1}`}
                className="text-sm px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Selanjutnya →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
