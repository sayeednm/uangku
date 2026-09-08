import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'
import DashboardDataLoader from './DashboardDataLoader'
import ActionFeedback from '@/components/ui/ActionFeedback'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <Suspense fallback={null}><ActionFeedback /></Suspense>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardDataLoader />
      </Suspense>
    </AppLayout>
  )
}
