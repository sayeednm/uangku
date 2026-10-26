import AppLayout from '@/components/layout/AppLayout'
import PageSkeleton from '@/components/ui/PageSkeleton'

export default function LainnyaLoading() {
  return (
    <AppLayout userEmail="">
      <PageSkeleton />
    </AppLayout>
  )
}
