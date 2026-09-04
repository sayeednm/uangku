import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import ActionFeedback from '@/components/ui/ActionFeedback'
import TransferContent from './TransferContent'
import PageSkeleton from '@/components/ui/PageSkeleton'

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function TransferPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const params = await searchParams

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <div>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transfer</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Transfer dana antar rekening</p>
          </div>
          <Link href="/transfer/baru" className="btn-primary text-sm flex-shrink-0">
            + Transfer
          </Link>
        </div>

        <Suspense fallback={null}><ActionFeedback /></Suspense>

        <Suspense fallback={<PageSkeleton />}>
          <TransferContent page={parseInt(params.page ?? '1', 10)} />
        </Suspense>
      </div>
    </AppLayout>
  )
}
