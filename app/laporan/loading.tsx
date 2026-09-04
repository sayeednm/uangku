import AppLayout from '@/components/layout/AppLayout'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'

export default function LaporanLoading() {
  return (
    <AppLayout userEmail="">
      <DashboardSkeleton />
    </AppLayout>
  )
}
