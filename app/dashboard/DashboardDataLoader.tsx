import { getDashboardData } from '@/lib/dashboard/queries'
import { getPeriodRange } from '@/lib/utils/date'
import DashboardClient from '@/components/dashboard/DashboardClient'

const DEFAULT_PERIOD = 'this_month' as const

export default async function DashboardDataLoader() {
  const { start, end } = getPeriodRange(DEFAULT_PERIOD)

  let dashboardData
  try {
    dashboardData = await getDashboardData(start, end)
  } catch {
    dashboardData = {
      accounts: [],
      totalBalance: 0,
      periodSummary: { income: 0, expense: 0 },
      recentTransactions: [],
      categorySpending: [],
    }
  }

  return (
    <DashboardClient
      initialData={dashboardData}
      initialPeriod={DEFAULT_PERIOD}
    />
  )
}
