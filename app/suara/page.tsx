import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccounts } from '@/lib/rekening/queries'
import { getCategoriesByType } from '@/lib/kategori/queries'
import SuaraClient from './SuaraClient'

export const metadata = { title: 'Catat Suara - Uangku' }

export default async function SuaraPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const [accounts, incomeCategories, expenseCategories] = await Promise.all([
    getAccounts().catch(() => []),
    getCategoriesByType('income').catch(() => []),
    getCategoriesByType('expense').catch(() => []),
  ])

  return (
    <SuaraClient
      accounts={accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))}
      incomeCategories={incomeCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
      expenseCategories={expenseCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
    />
  )
}
