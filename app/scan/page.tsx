import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccounts } from '@/lib/rekening/queries'
import { getCategoriesByType } from '@/lib/kategori/queries'
import ScanClient from './ScanClient'

export const metadata = { title: 'Scan Struk - Uangku' }

export default async function ScanPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const [accounts, expenseCategories] = await Promise.all([
    getAccounts().catch(() => []),
    getCategoriesByType('expense').catch(() => []),
  ])

  return (
    <ScanClient
      accounts={accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))}
      expenseCategories={expenseCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
    />
  )
}
