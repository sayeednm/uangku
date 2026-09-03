import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardData } from '@/lib/dashboard/queries'
import { getPeriodRange } from '@/lib/utils/date'
import AppLayout from '@/components/layout/AppLayout'
import DashboardClient from '@/components/dashboard/DashboardClient'

const DEFAULT_PERIOD = 'this_month' as const

export default async function DashboardPage() {
  const supabase = await createClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // Fetch initial dashboard data server-side
  const { start, end } = getPeriodRange(DEFAULT_PERIOD)
  let dashboardData
  try {
    dashboardData = await getDashboardData(start, end)
  } catch {
    // If fetching fails entirely, pass empty data and let the client handle error display
    dashboardData = {
      accounts:           [],
      totalBalance:       0,
      periodSummary:      { income: 0, expense: 0 },
      recentTransactions: [],
      categorySpending:   [],
    }
  }

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <DashboardClient
        initialData={dashboardData}
        initialPeriod={DEFAULT_PERIOD}
      />
    </AppLayout>
  )
}
