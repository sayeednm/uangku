import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getTransactions, type TransactionFilters as TxFilters } from '@/lib/transaksi/queries'
import { getAccounts } from '@/lib/rekening/queries'
import { getCategories } from '@/lib/kategori/queries'
import AppLayout from '@/components/layout/AppLayout'
import TransactionList from '@/components/transaksi/TransactionList'
import TransactionFilters from '@/components/transaksi/TransactionFilters'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'
import ActionFeedback from '@/components/ui/ActionFeedback'

interface PageProps {
  searchParams: Promise<{
    type?: string
    account_id?: string
    category_id?: string
    date_from?: string
    date_to?: string
    search?: string
    page?: string
  }>
}

export default async function TransaksiPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  const filters: TxFilters = {
    type: params.type as TxFilters['type'],
    account_id: params.account_id,
    category_id: params.category_id,
    date_from: params.date_from,
    date_to: params.date_to,
    search: params.search,
  }

  const [txResult, accounts, categories] = await Promise.all([
    getTransactions(filters, page).catch(() => ({ data: [], total: 0, page: 1, pageSize: 20 })),
    getAccounts().catch(() => []),
    getCategories().catch(() => []),
  ])

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transaksi</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {txResult.total > 0 ? `${txResult.total} transaksi` : 'Semua pemasukan dan pengeluaran'}
            </p>
          </div>
          <Link href="/transaksi/baru" className="btn-primary text-sm flex-shrink-0">
            + Tambah
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <Suspense fallback={null}>
            <ActionFeedback />
          </Suspense>
          <Suspense fallback={null}>
            <TransactionFilters
              accounts={accounts.map(a => ({ id: a.id, name: a.name }))}
              categories={categories.map(c => ({ id: c.id, name: c.name, type: c.type }))}
            />
          </Suspense>
        </div>

        {/* List */}
        <Suspense fallback={<DashboardSkeleton />}>
          <TransactionList
            transactions={txResult.data}
            total={txResult.total}
            page={txResult.page}
            pageSize={txResult.pageSize}
          />
        </Suspense>
      </div>
    </AppLayout>
  )
}
