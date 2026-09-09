import { redirect, notFound } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getTransactionById } from '@/lib/transaksi/queries'
import { updateTransactionAction } from '@/lib/transaksi/actions'
import { getAccounts } from '@/lib/rekening/queries'
import { getCategoriesByType } from '@/lib/kategori/queries'
import AppLayout from '@/components/layout/AppLayout'
import TransactionForm from '@/components/transaksi/TransactionForm'
import BackButton from '@/components/ui/BackButton'

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
        <div className="flex items-center gap-3 mb-6">
          <BackButton href="/transaksi" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Transaksi</h1>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <Suspense fallback={null}>
            <TransactionForm
              transaction={transaction}
              accounts={accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))}
              incomeCategories={incomeCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
              expenseCategories={expenseCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
              action={boundAction}
            />
          </Suspense>
        </div>
      </div>
    </AppLayout>
  )
}
