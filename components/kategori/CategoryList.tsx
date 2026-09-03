'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { archiveCategoryAction } from '@/lib/kategori/actions'
import type { CategoryRow } from '@/lib/kategori/queries'

interface CategoryListProps {
  categories: CategoryRow[]
}

function CategoryItem({ category }: { category: CategoryRow }) {
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const isDefault = category.is_default

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archiveCategoryAction(category.id)
      if (result && 'error' in result) {
        setActionError(result.error ?? null)
        setShowConfirm(false)
      }
    })
  }

  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0 transition-opacity ${isPending ? 'opacity-40' : ''}`}>
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm flex-shrink-0">
        {category.icon ?? '📦'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{category.name}</p>
        {isDefault && <p className="text-xs text-gray-400 dark:text-gray-500">Default</p>}
      </div>
      {!isDefault && (
        <div className="flex items-center gap-1">
          <Link
            href={`/kategori/${category.id}/edit`}
            className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Edit kategori"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Link>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isPending}
            className="p-1.5 rounded text-gray-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
            aria-label="Arsipkan kategori"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </button>
        </div>
      )}

      {showConfirm && (
        <div className="absolute inset-x-0 mt-1 ml-11 mr-4 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg z-10">
          <p className="text-xs text-gray-700 dark:text-gray-300 font-medium mb-2">Arsipkan kategori ini?</p>
          <div className="flex gap-2">
            <button onClick={handleArchive} disabled={isPending}
              className="text-xs font-medium px-3 py-1.5 bg-danger-600 text-white rounded-lg hover:bg-danger-700 disabled:opacity-50">
              Arsipkan
            </button>
            <button onClick={() => setShowConfirm(false)} disabled={isPending}
              className="text-xs font-medium px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              Batal
            </button>
          </div>
          {actionError && <p className="text-xs text-danger-600 mt-1">{actionError}</p>}
        </div>
      )}
    </div>
  )
}

export default function CategoryList({ categories }: CategoryListProps) {
  if (categories.length === 0) {
    return (
      <div className="py-6 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
        <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada kategori</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 relative">
      {categories.map(cat => (
        <CategoryItem key={cat.id} category={cat} />
      ))}
    </div>
  )
}
