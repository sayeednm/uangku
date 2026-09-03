'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { formatCurrency } from '@/lib/utils/currency'
import { archiveAccountAction } from '@/lib/rekening/actions'
import ConfirmSheet from '@/components/ui/ConfirmSheet'
import { useToast } from '@/components/ui/Toast'
import type { AccountWithBalance } from '@/lib/rekening/queries'

const TYPE_LABELS: Record<string, string> = {
  cash: 'Tunai', bank: 'Bank', ewallet: 'E-Wallet', other: 'Lainnya',
}

const TYPE_ICONS: Record<string, string> = {
  cash:    'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  bank:    'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  ewallet: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  other:   'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
}

export default function AccountCard({ account }: { account: AccountWithBalance }) {
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const { success, error: showError } = useToast()

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archiveAccountAction(account.id)
      setShowConfirm(false)
      if (result && 'error' in result && result.error) showError(result.error)
      else success('Rekening diarsipkan')
    })
  }

  return (
    <>
      <div className={`border border-gray-200/60 dark:border-white/[0.08] rounded-2xl p-5 bg-white dark:bg-white/[0.03] transition-opacity ${isPending ? 'opacity-50' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/[0.07] flex items-center justify-center text-gray-500 dark:text-gray-400 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d={TYPE_ICONS[account.type] ?? TYPE_ICONS.other} />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">{account.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{TYPE_LABELS[account.type] ?? 'Lainnya'}</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <Link href={`/rekening/${account.id}/edit`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.07] transition-all"
              aria-label="Edit">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Link>
            <button onClick={() => setShowConfirm(true)} disabled={isPending}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
              aria-label="Arsipkan">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Balance */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
          <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
            {formatCurrency(account.current_balance)}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Masuk <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(account.income_total)}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Keluar <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(account.expense_total)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <ConfirmSheet
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleArchive}
        isPending={isPending}
        title="Arsipkan rekening ini?"
        description="Rekening tidak akan muncul di pilihan transaksi baru, tapi histori tetap tersimpan."
        confirmLabel="Arsipkan"
        danger={false}
      />
    </>
  )
}
