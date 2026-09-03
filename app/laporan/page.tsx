import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import ReportClient from '@/components/laporan/ReportClient'

export default async function LaporanPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <ReportClient initialPeriod="this_month" />
    </AppLayout>
  )
}
