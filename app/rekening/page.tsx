import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getAccounts, type AccountWithBalance } from '@/lib/rekening/queries'
import AppLayout from '@/components/layout/AppLayout'
import AccountList from '@/components/rekening/AccountList'
import { formatCurrency } from '@/lib/utils/currency'
import ActionFeedback from '@/components/ui/ActionFeedback'

export default async function RekeningPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  let accounts: AccountWithBalance[] = []
  let fetchError = false
  try {
    accounts = await getAccounts()
  } catch {
    fetchError = true
  }

  const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0)

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rekening & Dompet</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Kelola semua rekening dan dompet Anda
            </p>
          </div>
          <Link href="/rekening/baru" className="btn-primary text-sm flex-shrink-0">
            + Tambah
          </Link>
        </div>

        {/* Total balance summary */}
        {!fetchError && accounts.length > 0 && (
          <div className="mb-6 p-5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-1">Total Saldo</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
              {formatCurrency(totalBalance)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{accounts.length} rekening aktif</p>
          </div>
        )}

        {/* Error state */}
        {fetchError ? (
          <div className="text-center py-16">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Gagal memuat data</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Coba muat ulang halaman.</p>
          </div>
        ) : (
          <AccountList accounts={accounts} />
        )}
        <Suspense fallback={null}><ActionFeedback /></Suspense>
      </div>
    </AppLayout>
  )
}
