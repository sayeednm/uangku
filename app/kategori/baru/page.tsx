import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createCategoryAction } from '@/lib/kategori/actions'
import AppLayout from '@/components/layout/AppLayout'
import CategoryForm from '@/components/kategori/CategoryForm'

export default async function KategoriBaruPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <div className="max-w-lg">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/kategori" className="hover:text-gray-700 dark:hover:text-gray-200">Kategori</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">Tambah</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tambah Kategori</h1>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <CategoryForm action={createCategoryAction} />
        </div>
      </div>
    </AppLayout>
  )
}
