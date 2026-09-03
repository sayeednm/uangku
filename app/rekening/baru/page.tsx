import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import AccountForm from '@/components/rekening/AccountForm'
import { createAccountAction } from '@/lib/rekening/actions'
import Link from 'next/link'

export default async function RekeningBaruPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <div className="max-w-lg">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/rekening" className="hover:text-gray-700 dark:hover:text-gray-200">Rekening</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">Tambah Rekening</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tambah Rekening</h1>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <AccountForm action={createAccountAction} />
        </div>
      </div>
    </AppLayout>
  )
}
