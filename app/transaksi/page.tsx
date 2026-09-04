import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import ActionFeedback from '@/components/ui/ActionFeedback'
import TransaksiContent from './TransaksiContent'
import PageSkeleton from '@/components/ui/PageSkeleton'

interface PageProps {
  searchParams: Promise<{
    type?: string
    account_id?: string
    category_id?: string
    date_from?: string
    date_to?: string
    search?: string
    page?: string
  }>
}

export default async function TransaksiPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const params = await searchParams

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <div>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transaksi</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Semua pemasukan dan pengeluaran
            </p>
          </div>
          <Link href="/transaksi/baru" className="btn-primary text-sm flex-shrink-0">
            + Tambah
          </Link>
        </div>

        <Suspense fallback={null}><ActionFeedback /></Suspense>

        {/* Stream data content */}
        <Suspense fallback={<PageSkeleton />}>
          <TransaksiContent searchParams={params} />
        </Suspense>
      </div>
    </AppLayout>
  )
}
