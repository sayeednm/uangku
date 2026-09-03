'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CategoryRow } from '@/lib/kategori/queries'

const COMMON_ICONS = [
  '🍽️','🚗','🛒','📄','🏠','⚕️','🎮','📚','👕','👨‍👩‍👧',
  '💰','💼','🎁','📈','🎉','📦','🏋️','✈️','☕','🎵',
  '💊','📱','🔧','🛁',
]

interface CategoryFormProps {
  category?: CategoryRow
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

export default function CategoryForm({ category, action }: CategoryFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedIcon, setSelectedIcon] = useState(category?.icon ?? '')
  const [type, setType] = useState<'expense' | 'income'>(
    (category?.type as 'expense' | 'income') ?? 'expense'
  )

  const isEdit = !!category

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await action(formData)
      if (result && 'error' in result && result.error) setError(result.error)
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Tipe — hanya saat create */}
      {!isEdit && (
        <div>
          <p className="label">Tipe</p>
          <input type="hidden" name="type" value={type} />
          <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {(['expense', 'income'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                disabled={isPending}
                className={`py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  type === t
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {t === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nama */}
      <div>
        <label htmlFor="cat-name" className="label">Nama Kategori</label>
        <input
          id="cat-name" name="name" type="text" required disabled={isPending}
          defaultValue={category?.name ?? ''}
          className="input dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
          placeholder="Contoh: Makanan" maxLength={100} autoFocus
        />
      </div>

      {/* Icon picker */}
      <div>
        <p className="label">
          Ikon <span className="text-gray-400 dark:text-gray-500 font-normal normal-case">(opsional)</span>
        </p>
        <input type="hidden" name="icon" value={selectedIcon} />
        <div className="flex flex-wrap gap-2 mb-2">
          {COMMON_ICONS.map(icon => (
            <button
              key={icon}
              type="button"
              disabled={isPending}
              onClick={() => setSelectedIcon(icon === selectedIcon ? '' : icon)}
              className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all duration-100 ${
                selectedIcon === icon
                  ? 'bg-gray-900 dark:bg-white ring-2 ring-gray-900 dark:ring-white scale-110'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              aria-label={`Pilih ikon ${icon}`}
              aria-pressed={selectedIcon === icon}
            >
              {icon}
            </button>
          ))}
        </div>
        {selectedIcon && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Dipilih: {selectedIcon}</span>
            <button
              type="button"
              onClick={() => setSelectedIcon('')}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 underline"
            >
              Hapus
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Menyimpan...
            </span>
          ) : isEdit ? 'Simpan Perubahan' : 'Tambah Kategori'}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Batal
        </button>
      </div>
    </form>
  )
}
