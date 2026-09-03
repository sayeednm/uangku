import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAccounts } from '@/lib/rekening/queries'
import { createTransferAction } from '@/lib/transfer/actions'
import AppLayout from '@/components/layout/AppLayout'
import TransferForm from '@/components/transfer/TransferForm'

export default async function TransferBaruPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const accounts = await getAccounts().catch(() => [])

  if (accounts.length < 2) {
    return (
      <AppLayout userEmail={user.email ?? ''}>
        <div className="max-w-lg">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Transfer Dana</h1>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rekening tidak mencukupi</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Butuh minimal 2 rekening aktif untuk melakukan transfer.
            </p>
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
          <Link href="/transfer" className="hover:text-gray-700 dark:hover:text-gray-200">Transfer</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">Tambah</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Transfer Dana</h1>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <TransferForm
            accounts={accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))}
            action={createTransferAction}
          />
        </div>
      </div>
    </AppLayout>
  )
}
