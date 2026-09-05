import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'
import DashboardDataLoader from './DashboardDataLoader'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Auth check only — fast, no data fetching here
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  return (
    <AppLayout userEmail={user.email ?? ''}>
      {/* Layout renders immediately, data streams in */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardDataLoader />
      </Suspense>
    </AppLayout>
  )
}
