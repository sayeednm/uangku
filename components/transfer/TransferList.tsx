'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { deleteTransferAction } from '@/lib/transfer/actions'
import type { TransferWithAccounts } from '@/lib/transfer/queries'

interface TransferListProps {
  transfers: TransferWithAccounts[]
  total: number
  page: number
  pageSize: number
}

function TransferItem({ transfer: t }: { transfer: TransferWithAccounts }) {
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fromName = (t.from_account as { name: string })?.name ?? '-'
  const toName = (t.to_account as { name: string })?.name ?? '-'

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteTransferAction(t.id)
      if (result && 'error' in result) {
        setDeleteError(result.error ?? null)
        setShowConfirm(false)
      }
    })
  }

  return (
    <div className={`py-3 transition-opacity ${isPending ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-base flex-shrink-0">
          ↔️
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {t.description ?? `${fromName} → ${toName}`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {fromName} → {toName} · {formatDate(t.transaction_date)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <p className="text-sm font-semibold text-gray-700 tabular-nums">
            {formatCurrency(t.amount)}
          </p>
          <button
            onClick={() => setShowConfirm(true)} disabled={isPending}
            className="p-1.5 rounded text-gray-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
            aria-label="Hapus transfer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="mt-2 ml-12 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-700 font-medium mb-2">Hapus transfer ini?</p>
          <div className="flex gap-2">
            <button onClick={handleDelete} disabled={isPending}
              className="text-xs font-medium px-3 py-1.5 bg-danger-600 text-white rounded-lg hover:bg-danger-700 disabled:opacity-50">
              Hapus
            </button>
            <button onClick={() => setShowConfirm(false)} disabled={isPending}
              className="text-xs font-medium px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Batal
            </button>
          </div>
          {deleteError && <p className="text-xs text-danger-600 mt-1">{deleteError}</p>}
        </div>
      )}
    </div>
  )
}

export default function TransferList({ transfers, total, page, pageSize }: TransferListProps) {
  if (transfers.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">Belum ada transfer</p>
        <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
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
      <div className="divide-y divide-gray-100">
        {transfers.map(t => <TransferItem key={t.id} transfer={t} />)}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">{total} transfer · Hal {page}/{totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`?page=${page - 1}`}
                className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                ← Sebelumnya
              </Link>
            )}
            {page < totalPages && (
              <Link href={`?page=${page + 1}`}
                className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                Selanjutnya →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
