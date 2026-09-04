'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { deleteTransferAction } from '@/lib/transfer/actions'
import ConfirmSheet from '@/components/ui/ConfirmSheet'
import { useToast } from '@/components/ui/Toast'
import type { TransferWithAccounts } from '@/lib/transfer/queries'

function TransferItem({ transfer: t }: { transfer: TransferWithAccounts }) {
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const { success, error: showError } = useToast()

  const fromName = (t.from_account as { name: string })?.name ?? '-'
  const toName = (t.to_account as { name: string })?.name ?? '-'

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteTransferAction(t.id)
      setShowConfirm(false)
      if (result && 'error' in result && result.error) showError(result.error)
      else success('Transfer berhasil dihapus')
    })
  }

  return (
    <>
      <div className={`flex items-center gap-3 py-3.5 group transition-opacity ${isPending ? 'opacity-40' : ''}`}>
        {/* Icon */}
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}>
          <svg className="w-5 h-5" fill="none" stroke="#6366f1" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">
            {t.description ?? `${fromName} → ${toName}`}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            {fromName} → {toName} · {formatDate(t.transaction_date)}
          </p>
        </div>

        {/* Amount + action */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <p className="text-[13px] font-bold text-indigo-500 dark:text-indigo-400 tabular-nums">
            {formatCurrency(t.amount)}
          </p>
          <button
            onClick={() => setShowConfirm(true)} disabled={isPending}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
            aria-label="Hapus transfer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <ConfirmSheet
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        isPending={isPending}
        title="Hapus transfer ini?"
        description="Saldo rekening akan dikembalikan ke kondisi sebelum transfer."
        confirmLabel="Hapus"
        danger
      />
    </>
  )
}

export default function TransferList({ transfers, total, page, pageSize }: TransferListProps) {
  if (transfers.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}>
          <svg className="w-7 h-7" fill="none" stroke="#6366f1" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Belum ada transfer</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
          Transfer dana antar rekening tidak akan dihitung sebagai pemasukan atau pengeluaran.
        </p>
        <Link href="/transfer/baru" className="inline-block mt-4 btn-primary text-sm">
          + Transfer Dana
        </Link>
      </div>
    )
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.07] rounded-2xl px-4 divide-y divide-gray-100 dark:divide-white/[0.05]">
        {transfers.map(t => <TransferItem key={t.id} transfer={t} />)}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4">
          <p className="text-xs text-gray-400 dark:text-gray-500">{total} transfer · Hal {page}/{totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`?page=${page - 1}`}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                ← Sebelumnya
              </Link>
            )}
            {page < totalPages && (
              <Link href={`?page=${page + 1}`}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                Selanjutnya →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface TransferListProps {
  transfers: TransferWithAccounts[]
  total: number
  page: number
  pageSize: number
}
