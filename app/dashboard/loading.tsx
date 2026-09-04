import AppLayout from '@/components/layout/AppLayout'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'

export default function DashboardLoading() {
  return (
    <AppLayout userEmail="">
      <DashboardSkeleton />
    </AppLayout>
  )
}
