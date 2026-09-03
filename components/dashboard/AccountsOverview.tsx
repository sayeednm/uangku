import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/currency'
import EmptyState from './EmptyState'
import type { AccountWithBalance } from '@/lib/dashboard/queries'
import type { AccountType } from '@/types/database.types'

const TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Tunai', bank: 'Bank', ewallet: 'E-Wallet', other: 'Lainnya',
}

const TYPE_ICONS: Record<AccountType, string> = {
  cash:    'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  bank:    'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  ewallet: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  other:   'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
}

export default function AccountsOverview({ accounts }: { accounts: AccountWithBalance[] }) {
  return (
    <section aria-labelledby="accounts-heading" className="animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <h2
          id="accounts-heading"
          className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest"
        >
          Rekening & Dompet
        </h2>
        {accounts.length > 0 && (
          <Link
            href="/rekening"
            className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Kelola →
          </Link>
        )}
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          title="Belum ada rekening"
          description="Tambahkan rekening atau dompet untuk mulai mencatat saldo."
          action={{ label: '+ Tambah Rekening', href: '/rekening/baru' }}
        />
      ) : (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.07] rounded-2xl px-4 divide-y divide-gray-100 dark:divide-white/[0.05]">
          {accounts.map(account => (
            <div key={account.id} className="flex items-center justify-between py-3.5 group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={TYPE_ICONS[account.type]} />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                    {account.name}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {TYPE_LABELS[account.type]}
                  </p>
                </div>
              </div>
              <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {formatCurrency(account.current_balance)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
