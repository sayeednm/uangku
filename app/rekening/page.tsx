import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import ActionFeedback from '@/components/ui/ActionFeedback'
import RekeningContent from './RekeningContent'
import PageSkeleton from '@/components/ui/PageSkeleton'

export default async function RekeningPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <div>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rekening & Dompet</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Kelola semua rekening dan dompet Anda
            </p>
          </div>
          <Link href="/rekening/baru" className="btn-primary text-sm flex-shrink-0">
            + Tambah
          </Link>
        </div>

        {/* Data streamed separately — page renders immediately */}
        <Suspense fallback={<PageSkeleton />}>
          <RekeningContent />
        </Suspense>

        <Suspense fallback={null}><ActionFeedback /></Suspense>
      </div>
    </AppLayout>
  )
}
