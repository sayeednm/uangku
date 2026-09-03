import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAccounts } from '@/lib/rekening/queries'
import { getCategoriesByType } from '@/lib/kategori/queries'
import { createTransactionAction } from '@/lib/transaksi/actions'
import AppLayout from '@/components/layout/AppLayout'
import TransactionForm from '@/components/transaksi/TransactionForm'

interface PageProps {
  searchParams: Promise<{ type?: string }>
}

export default async function TransaksiBaruPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const params = await searchParams
  const defaultType = params.type === 'income' ? 'income' : 'expense'

  const [accounts, incomeCategories, expenseCategories] = await Promise.all([
    getAccounts().catch(() => []),
    getCategoriesByType('income').catch(() => []),
    getCategoriesByType('expense').catch(() => []),
  ])

  if (accounts.length === 0) {
    return (
      <AppLayout userEmail={user.email ?? ''}>
        <div className="max-w-lg">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tambah Transaksi</h1>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Belum ada rekening</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Tambahkan rekening terlebih dahulu sebelum mencatat transaksi.</p>
            <Link href="/rekening/baru" className="btn-primary text-sm">+ Tambah Rekening</Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <div className="max-w-lg">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/transaksi" className="hover:text-gray-700 dark:hover:text-gray-200">Transaksi</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">Tambah</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tambah Transaksi</h1>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <TransactionForm
            accounts={accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))}
            incomeCategories={incomeCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
            expenseCategories={expenseCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
            action={createTransactionAction}
            defaultType={defaultType}
          />
        </div>
      </div>
    </AppLayout>
  )
}
