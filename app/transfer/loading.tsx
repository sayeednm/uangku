import AppLayout from '@/components/layout/AppLayout'
import PageSkeleton from '@/components/ui/PageSkeleton'

export default function TransferLoading() {
  return (
    <AppLayout userEmail="">
      <PageSkeleton />
    </AppLayout>
  )
}
