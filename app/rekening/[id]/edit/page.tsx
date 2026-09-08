import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccountById } from '@/lib/rekening/queries'
import { updateAccountAction } from '@/lib/rekening/actions'
import AppLayout from '@/components/layout/AppLayout'
import AccountForm from '@/components/rekening/AccountForm'
import BackButton from '@/components/ui/BackButton'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditRekeningPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const account = await getAccountById(id)
  if (!account) notFound()

  // Bind the id into the action
  const boundAction = updateAccountAction.bind(null, id)

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <div className="max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <BackButton href="/rekening" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Rekening</h1>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <AccountForm account={account} action={boundAction} />
        </div>
      </div>
    </AppLayout>
  )
}
