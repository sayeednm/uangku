import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTransactionById } from '@/lib/transaksi/queries'
import { updateTransactionAction } from '@/lib/transaksi/actions'
import { getAccounts } from '@/lib/rekening/queries'
import { getCategoriesByType } from '@/lib/kategori/queries'
import AppLayout from '@/components/layout/AppLayout'
import TransactionForm from '@/components/transaksi/TransactionForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditTransaksiPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const [transaction, accounts, incomeCategories, expenseCategories] = await Promise.all([
    getTransactionById(id),
    getAccounts().catch(() => []),
    getCategoriesByType('income').catch(() => []),
    getCategoriesByType('expense').catch(() => []),
  ])

  if (!transaction) notFound()

  const boundAction = updateTransactionAction.bind(null, id)

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <div className="max-w-lg">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/transaksi" className="hover:text-gray-700 dark:hover:text-gray-200">Transaksi</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">Edit</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Transaksi</h1>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <TransactionForm
            transaction={transaction}
            accounts={accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))}
            incomeCategories={incomeCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
            expenseCategories={expenseCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
            action={boundAction}
          />
        </div>
      </div>
    </AppLayout>
  )
}
