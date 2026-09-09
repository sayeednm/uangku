import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import ActionFeedback from '@/components/ui/ActionFeedback'
import ExportButton from '@/components/transaksi/ExportButton'
import TransaksiContent from './TransaksiContent'
import PageSkeleton from '@/components/ui/PageSkeleton'

export default async function TransaksiPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

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
          <div className="flex items-center gap-2 flex-shrink-0">
            <Suspense fallback={null}><ExportButton /></Suspense>
            <Link href="/transaksi/baru" className="btn-primary text-sm">
              + Tambah
            </Link>
          </div>
        </div>

        <Suspense fallback={null}><ActionFeedback /></Suspense>

        {/* Fetch all once, filter client-side = instant response */}
        <Suspense fallback={<PageSkeleton />}>
          <TransaksiContent />
        </Suspense>
      </div>
    </AppLayout>
  )
}
