import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccounts } from '@/lib/rekening/queries'
import { getCategoriesByType } from '@/lib/kategori/queries'
import SuaraClient from './SuaraClient'

export const metadata = { title: 'Catat Suara - Uangku' }

export default async function SuaraPage() {
  const supabase = await createClient()
  // Auth + data in parallel: RLS is already enforced by the request cookie,
  // this only needs to confirm the session before rendering. Cuts a full
  // serial auth round-trip out of every navigation.
  const [userRes, accounts, incomeCategories, expenseCategories] = await Promise.all([
    supabase.auth.getUser(),
    getAccounts().catch(() => []),
    getCategoriesByType('income').catch(() => []),
    getCategoriesByType('expense').catch(() => []),
  ])
  const { data: { user }, error } = userRes
  if (error || !user) redirect('/login')

  return (
    <SuaraClient
      accounts={accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))}
      incomeCategories={incomeCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
      expenseCategories={expenseCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
    />
  )
}
