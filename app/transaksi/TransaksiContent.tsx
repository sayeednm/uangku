import { Suspense } from 'react'
import { getTransactions, type TransactionFilters as TxFilters } from '@/lib/transaksi/queries'
import { getAccounts } from '@/lib/rekening/queries'
import { getCategories } from '@/lib/kategori/queries'
import TransactionList from '@/components/transaksi/TransactionList'
import TransactionFilters from '@/components/transaksi/TransactionFilters'

interface Props {
  searchParams: {
    type?: string
    account_id?: string
    category_id?: string
    date_from?: string
    date_to?: string
    search?: string
    page?: string
  }
}

export default async function TransaksiContent({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))

  const filters: TxFilters = {
    type: searchParams.type as TxFilters['type'],
    account_id: searchParams.account_id,
    category_id: searchParams.category_id,
    date_from: searchParams.date_from,
    date_to: searchParams.date_to,
    search: searchParams.search,
  }

  const [txResult, accounts, categories] = await Promise.all([
    getTransactions(filters, page).catch(() => ({ data: [], total: 0, page: 1, pageSize: 20 })),
    getAccounts().catch(() => []),
    getCategories().catch(() => []),
  ])

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <TransactionFilters
          accounts={accounts.map(a => ({ id: a.id, name: a.name }))}
          categories={categories.map(c => ({ id: c.id, name: c.name, type: c.type }))}
        />
      </Suspense>

      <TransactionList
        transactions={txResult.data}
        total={txResult.total}
        page={txResult.page}
        pageSize={txResult.pageSize}
      />
    </div>
  )
}
