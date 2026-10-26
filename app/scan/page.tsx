import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccounts } from '@/lib/rekening/queries'
import { getCategoriesByType } from '@/lib/kategori/queries'
import ScanClient from './ScanClient'

export const metadata = { title: 'Scan Struk - Uangku' }

export default async function ScanPage() {
  const supabase = await createClient()
  // Auth + data in parallel (RLS is enforced by the request cookie)
  const [userRes, accounts, expenseCategories] = await Promise.all([
    supabase.auth.getUser(),
    getAccounts().catch(() => []),
    getCategoriesByType('expense').catch(() => []),
  ])
  const { data: { user }, error } = userRes
  if (error || !user) redirect('/login')

  return (
    <ScanClient
      accounts={accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))}
      expenseCategories={expenseCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
    />
  )
}
