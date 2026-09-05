'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import CurrencyInput from '@/components/ui/CurrencyInput'
import type { AccountRow } from '@/lib/rekening/queries'

export type AccountType = 'cash' | 'bank' | 'ewallet' | 'other'

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'cash',    label: 'Tunai' },
  { value: 'bank',    label: 'Bank' },
  { value: 'ewallet', label: 'E-Wallet' },
  { value: 'other',   label: 'Lainnya' },
]

interface AccountFormProps {
  /** If provided, form is in edit mode */
  account?: AccountRow
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

export default function AccountForm({ account, action }: AccountFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!account

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await action(formData)
      if (result && 'error' in result && result.error) {
        setError(result.error)
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Nama */}
      <div>
        <label htmlFor="name" className="label">Nama Rekening</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          disabled={isPending}
          defaultValue={account?.name ?? ''}
          className="input"
          placeholder="Contoh: BCA, Dompet Tunai"
          maxLength={100}
          autoFocus
        />
      </div>

      {/* Tipe */}
      <div>
        <label htmlFor="type" className="label">Tipe Rekening</label>
        <select
          id="type"
          name="type"
          required
          disabled={isPending}
          defaultValue={account?.type ?? 'bank'}
          className="input"
        >
          {ACCOUNT_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Saldo Awal */}
      <div>
        <label className="label">Saldo Awal</label>
        <CurrencyInput
          name="initial_balance"
          defaultValue={account?.initial_balance}
          disabled={isPending}
        />
        {isEdit && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            Mengubah saldo awal akan mempengaruhi total saldo.
          </p>
        )}
      </div>

      {/* Actions */}
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
          ) : isEdit ? 'Simpan Perubahan' : 'Tambah Rekening'}
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
