import { getTransfers } from '@/lib/transfer/queries'
import TransferList from '@/components/transfer/TransferList'

export default async function TransferContent({ page }: { page: number }) {
  const result = await getTransfers(Math.max(1, page)).catch(() => ({
    data: [], total: 0, page: 1, pageSize: 20,
  }))

  return (
    <TransferList
      transfers={result.data}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
    />
  )
}
