import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCategories, type CategoryRow } from '@/lib/kategori/queries'
import AppLayout from '@/components/layout/AppLayout'
import CategoryList from '@/components/kategori/CategoryList'
import ActionFeedback from '@/components/ui/ActionFeedback'

export default async function KategoriPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  let categories: CategoryRow[] = []
  let fetchError = false
  try {
    categories = await getCategories()
  } catch {
    fetchError = true
  }

  const incomeCategories = categories.filter(c => c.type === 'income')
  const expenseCategories = categories.filter(c => c.type === 'expense')

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <div>
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kategori</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Kelola kategori pemasukan dan pengeluaran</p>
          </div>
          <Link href="/kategori/baru" className="btn-primary text-sm flex-shrink-0">
            + Tambah
          </Link>
        </div>

        {fetchError ? (
          <div className="text-center py-16">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Gagal memuat data</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Coba muat ulang halaman.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Pengeluaran
              </h2>
              <CategoryList categories={expenseCategories} />
            </section>
            <section>
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Pemasukan
              </h2>
              <CategoryList categories={incomeCategories} />
            </section>
          </div>
        )}
        <Suspense fallback={null}><ActionFeedback /></Suspense>
      </div>
    </AppLayout>
  )
}
