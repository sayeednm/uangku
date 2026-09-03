import Link from 'next/link'
import AccountCard from './AccountCard'
import type { AccountWithBalance } from '@/lib/rekening/queries'

interface AccountListProps {
  accounts: AccountWithBalance[]
}

export default function AccountList({ accounts }: AccountListProps) {
  if (accounts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Belum ada rekening</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
          Tambahkan rekening bank, dompet tunai, atau e-wallet untuk mulai mencatat keuangan Anda.
        </p>
        <Link href="/rekening/baru" className="inline-block mt-4 btn-primary text-sm">
          + Tambah Rekening
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {accounts.map(account => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  )
}
