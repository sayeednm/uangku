import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createCategoryAction } from '@/lib/kategori/actions'
import AppLayout from '@/components/layout/AppLayout'
import CategoryForm from '@/components/kategori/CategoryForm'
import BackButton from '@/components/ui/BackButton'

export default async function KategoriBaruPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <div className="max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <BackButton href="/kategori" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tambah Kategori</h1>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <CategoryForm action={createCategoryAction} />
        </div>
      </div>
    </AppLayout>
  )
}
