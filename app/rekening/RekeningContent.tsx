import { getAccounts } from '@/lib/rekening/queries'
import AccountList from '@/components/rekening/AccountList'
import { formatCurrency } from '@/lib/utils/currency'

export default async function RekeningContent() {
  let accounts = []
  let fetchError = false

  try {
    accounts = await getAccounts()
  } catch {
    fetchError = true
  }

  if (fetchError) {
    return (
      <div className="text-center py-16">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Gagal memuat data</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Coba muat ulang halaman.</p>
      </div>
    )
  }

  const totalBalance = accounts.reduce((sum: number, a: { current_balance: number }) => sum + a.current_balance, 0)

  return (
    <div className="space-y-4">
      {accounts.length > 0 && (
        <div
          className="p-5 rounded-2xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1040a8 0%, #1d6af5 55%, #3b82f6 100%)',
            boxShadow: '0 4px 20px rgba(29,106,245,0.3)',
          }}
        >
          <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest mb-1">Total Saldo</p>
          <p className="text-3xl font-bold text-white tabular-nums">{formatCurrency(totalBalance)}</p>
          <p className="text-xs text-white/50 mt-1">{accounts.length} rekening aktif</p>
        </div>
      )}
      <AccountList accounts={accounts} />
    </div>
  )
}
