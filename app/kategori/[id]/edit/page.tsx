import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCategoryById } from '@/lib/kategori/queries'
import { updateCategoryAction } from '@/lib/kategori/actions'
import AppLayout from '@/components/layout/AppLayout'
import CategoryForm from '@/components/kategori/CategoryForm'

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
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/kategori" className="hover:text-gray-700 dark:hover:text-gray-200">Kategori</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">Edit</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Kategori</h1>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <CategoryForm category={category} action={boundAction} />
        </div>
      </div>
    </AppLayout>
  )
}
