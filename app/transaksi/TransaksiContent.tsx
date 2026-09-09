import { getTransactions } from '@/lib/transaksi/queries'
import { getAccounts } from '@/lib/rekening/queries'
import { getCategories } from '@/lib/kategori/queries'
import TransactionClientView from '@/components/transaksi/TransactionClientView'

// Fetch all transactions once — filtering done client-side for instant response
export default async function TransaksiContent() {
  const [txResult, accounts, categories] = await Promise.all([
    getTransactions({}, 1, 500).catch(() => ({ data: [], total: 0, page: 1, pageSize: 500 })),
    getAccounts().catch(() => []),
    getCategories().catch(() => []),
  ])

  return (
    <TransactionClientView
      transactions={txResult.data}
      accounts={accounts.map(a => ({ id: a.id, name: a.name }))}
      categories={categories.map(c => ({ id: c.id, name: c.name, type: c.type }))}
    />
  )
}
