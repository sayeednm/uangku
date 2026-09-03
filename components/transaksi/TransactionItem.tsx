'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { deleteTransactionAction } from '@/lib/transaksi/actions'
import ConfirmSheet from '@/components/ui/ConfirmSheet'
import { useUndoToast } from '@/components/ui/UndoToast'
import type { TransactionWithRefs } from '@/lib/transaksi/queries'

interface TransactionItemProps {
  transaction: TransactionWithRefs
}

export default function TransactionItem({ transaction: tx }: TransactionItemProps) {
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const { show, UndoToastComponent } = useUndoToast()

  const isIncome = tx.type === 'income'
  const categoryIcon = (tx.category as { icon?: string | null })?.icon ?? '📦'
  const categoryName = (tx.category as { name?: string })?.name ?? 'Lainnya'
  const accountName = (tx.account as { name?: string })?.name ?? ''
  const label = tx.description ?? categoryName

  const executeDelete = () => {
    startTransition(async () => {
      await deleteTransactionAction(tx.id)
    })
  }

  const handleDeleteIntent = () => {
    setShowConfirm(false)
    // Optimistically hide the row
    setDeleted(true)

    show({
      message: 'Transaksi dihapus',
      onUndo: () => {
        // Restore the row
        setDeleted(false)
      },
      onConfirm: () => {
        // Actually delete after undo window closes
        executeDelete()
      },
    })
  }

  if (deleted) return UndoToastComponent

  return (
    <>
      <div className={`flex items-center gap-3 py-3.5 group transition-opacity ${isPending ? 'opacity-40' : ''}`}>
        {/* Icon */}
        <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center text-lg flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
          {categoryIcon}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">{label}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
            {categoryName}{accountName ? ` · ${accountName}` : ''} · {formatDate(tx.transaction_date)}
          </p>
        </div>

        {/* Amount */}
        <p className={`text-[13px] font-bold tabular-nums flex-shrink-0 ${
          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'
        }`}>
          {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Link href={`/transaksi/${tx.id}/edit`}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-[#1d6af5] hover:bg-[#1d6af5]/10 transition-all duration-150"
            aria-label="Edit">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Link>
          <button onClick={() => setShowConfirm(true)} disabled={isPending}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-150"
            aria-label="Hapus">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {UndoToastComponent}

      <ConfirmSheet
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDeleteIntent}
        isPending={isPending}
        title="Hapus transaksi ini?"
        description="Anda masih bisa membatalkan dalam beberapa detik setelah menghapus."
        confirmLabel="Hapus"
        danger
      />
    </>
  )
}
