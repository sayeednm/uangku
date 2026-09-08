import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCategoryById } from '@/lib/kategori/queries'
import { updateCategoryAction } from '@/lib/kategori/actions'
import AppLayout from '@/components/layout/AppLayout'
import CategoryForm from '@/components/kategori/CategoryForm'
import BackButton from '@/components/ui/BackButton'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditKategoriPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const category = await getCategoryById(id)
  if (!category || category.is_default) notFound()

  const boundAction = updateCategoryAction.bind(null, id)

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <div className="max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <BackButton href="/kategori" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Kategori</h1>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <CategoryForm category={category} action={boundAction} />
        </div>
      </div>
    </AppLayout>
  )
}
