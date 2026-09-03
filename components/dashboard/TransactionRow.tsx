'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { deleteTransactionAction } from '@/lib/transaksi/actions'
import ConfirmSheet from '@/components/ui/ConfirmSheet'
import { useToast } from '@/components/ui/Toast'
import type { TransactionWithCategory } from '@/lib/dashboard/queries'

interface TransactionRowProps {
  transaction: TransactionWithCategory
}

export default function TransactionRow({ transaction }: TransactionRowProps) {
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const { success, error: showError } = useToast()

  const isIncome = transaction.type === 'income'
  const categoryIcon = transaction.category?.icon ?? '📦'
  const categoryName = transaction.category?.name ?? 'Lainnya'
  const accountName = transaction.account?.name ?? ''
  const label = transaction.description ?? categoryName

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteTransactionAction(transaction.id)
      setShowConfirm(false)
      if (result && 'error' in result && result.error) showError(result.error)
      else success('Transaksi berhasil dihapus')
    })
  }

  return (
    <>
      <div className={`flex items-center gap-3 py-3.5 group transition-opacity ${isPending ? 'opacity-40' : ''}`}>
        {/* Icon */}
        <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center text-lg flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
          {categoryIcon}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
            {label}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
            {categoryName}{accountName ? ` · ${accountName}` : ''} · {formatDate(transaction.transaction_date)}
          </p>
        </div>

        {/* Amount + quick actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <p className={`text-[13px] font-bold tabular-nums mr-1 ${
            isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'
          }`}>
            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
          </p>

          {/* Edit & delete — visible on hover/focus */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <Link
              href={`/transaksi/${transaction.id}/edit`}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-[#1d6af5] hover:bg-blue-50 dark:hover:bg-[#1d6af5]/10 transition-all"
              aria-label="Edit transaksi"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Link>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isPending}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
              aria-label="Hapus transaksi"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <ConfirmSheet
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        isPending={isPending}
        title="Hapus transaksi ini?"
        description="Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus"
        danger
      />
    </>
  )
}
