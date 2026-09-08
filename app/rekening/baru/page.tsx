import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import AccountForm from '@/components/rekening/AccountForm'
import { createAccountAction } from '@/lib/rekening/actions'
import BackButton from '@/components/ui/BackButton'

export default async function RekeningBaruPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <div className="max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <BackButton href="/rekening" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tambah Rekening</h1>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <AccountForm action={createAccountAction} />
        </div>
      </div>
    </AppLayout>
  )
}
