'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CurrencyInput from '@/components/ui/CurrencyInput'
import NumpadInput from '@/components/ui/NumpadInput'
import CustomSelect from '@/components/ui/CustomSelect'
import ScanReceiptButton from './ScanReceiptButton'
import type { TransactionWithRefs } from '@/lib/transaksi/queries'
import type { AccountRow } from '@/lib/rekening/queries'
import type { CategoryRow } from '@/lib/kategori/queries'

interface TransactionFormProps {
  transaction?: TransactionWithRefs
  accounts: Pick<AccountRow, 'id' | 'name' | 'type'>[]
  incomeCategories: Pick<CategoryRow, 'id' | 'name' | 'icon'>[]
  expenseCategories: Pick<CategoryRow, 'id' | 'name' | 'icon'>[]
  action: (formData: FormData) => Promise<{ error?: string } | void>
  defaultType?: 'income' | 'expense'
}

const today = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function TransactionForm({
  transaction,
  accounts,
  incomeCategories: initialIncomeCategories,
  expenseCategories: initialExpenseCategories,
  action,
  defaultType = 'expense',
}: TransactionFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<'income' | 'expense'>(transaction?.type ?? defaultType)
  const isEdit = !!transaction

  // Categories state — starts with server-fetched, refreshes client-side
  const [incomeCategories, setIncomeCategories] = useState(initialIncomeCategories)
  const [expenseCategories, setExpenseCategories] = useState(initialExpenseCategories)

  const [selectedCategory, setSelectedCategory] = useState(transaction?.category_id ?? '')
  const [selectedAccount, setSelectedAccount] = useState(transaction?.account_id ?? (accounts[0]?.id ?? ''))
  const [selectedDate, setSelectedDate] = useState(transaction?.transaction_date ?? today())
  const [amountValue, setAmountValue] = useState(transaction ? String(transaction.amount) : '')

  // Refresh categories from Supabase client on mount + type change
  // This ensures custom categories created in another tab are visible
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('categories')
      .select('id, name, icon, type')
      .eq('is_archived', false)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (!data) return
        setIncomeCategories(data.filter(c => c.type === 'income'))
        setExpenseCategories(data.filter(c => c.type === 'expense'))
      })
  }, [])

  const categories = type === 'income' ? incomeCategories : expenseCategories

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType)
    if (!isEdit) setSelectedCategory('')
  }

  // Handle scan result — auto-fill all fields
  const handleScanResult = (result: {
    amount: number
    description: string
    date: string | null
    category: string
    confidence: number
  }) => {
    if (result.amount > 0) setAmountValue(String(result.amount))
    if (result.description) {
      const descInput = formRef.current?.elements.namedItem('description') as HTMLInputElement | null
      if (descInput) descInput.value = result.description
    }
    if (result.date) setSelectedDate(result.date)
    // Match category name to category id
    if (result.category) {
      const allCats = [...incomeCategories, ...expenseCategories]
      const match = allCats.find(c =>
        c.name.toLowerCase() === result.category.toLowerCase()
      )
      if (match) {
        setSelectedCategory(match.id)
        // Auto-set type based on matched category
        const catType = incomeCategories.find(c => c.id === match.id) ? 'income' : 'expense'
        setType(catType)
      }
    }
  }

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
      {/* Scan receipt — only on create */}
      {!isEdit && (
        <ScanReceiptButton onResult={handleScanResult} />
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Type toggle */}
      <div>
        <p className="label">Jenis Transaksi</p>
        <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {(['expense', 'income'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              disabled={isPending}
              className={`py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                type === t
                  ? t === 'expense'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-emerald-500 text-white shadow-sm'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {t === 'expense' ? '↓ Pengeluaran' : '↑ Pemasukan'}
            </button>
          ))}
        </div>
        <input type="hidden" name="type" value={type} />
      </div>

      {/* Amount — single hidden input controlled by state */}
      <input type="hidden" name="amount" value={amountValue || '0'} />
      <div>
        {/* Desktop */}
        <div className="hidden lg:block">
          <label className="label">Nominal</label>
          <CurrencyInput
            id="amount-display"
            name="_amount_display"
            defaultValue={transaction?.amount}
            disabled={isPending}
            autoFocus={!isEdit}
            onChange={val => setAmountValue(String(val))}
          />
        </div>
        {/* Mobile — calculator style */}
        <div className="lg:hidden">
          <NumpadInput
            name="_amount_numpad"
            defaultValue={transaction?.amount}
            onChange={val => setAmountValue(String(val))}
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category_id" className="label">Kategori</label>
        <CustomSelect
          id="category_id"
          name="category_id"
          value={selectedCategory}
          onChange={setSelectedCategory}
          placeholder="Pilih kategori"
          disabled={isPending}
          required
          options={categories.map(c => ({ value: c.id, label: c.name, icon: c.icon }))}
        />
        {categories.length === 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
            Belum ada kategori.{' '}
            <a href="/kategori/baru" className="font-semibold underline">Tambah kategori</a>
          </p>
        )}
      </div>

      {/* Account */}
      <div>
        <label htmlFor="account_id" className="label">Rekening</label>
        <CustomSelect
          id="account_id"
          name="account_id"
          value={selectedAccount}
          onChange={setSelectedAccount}
          placeholder="Pilih rekening"
          disabled={isPending}
          required
          options={accounts.map(a => ({ value: a.id, label: a.name }))}
        />
      </div>

      {/* Date */}
      <div>
        <label htmlFor="transaction_date" className="label">Tanggal</label>
        <input
          id="transaction_date"
          name="transaction_date"
          type="date"
          required
          disabled={isPending}
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="input [color-scheme:light] dark:[color-scheme:dark]"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="label">
          Keterangan <span className="text-gray-400 font-normal">(opsional)</span>
        </label>
        <input
          id="description"
          name="description"
          type="text"
          disabled={isPending}
          defaultValue={transaction?.description ?? ''}
          className="input"
          placeholder="Contoh: Makan siang"
          maxLength={200}
        />
      </div>

      {/* Note */}
      <div>
        <label htmlFor="note" className="label">
          Catatan <span className="text-gray-400 font-normal">(opsional)</span>
        </label>
        <textarea
          id="note"
          name="note"
          disabled={isPending}
          defaultValue={transaction?.note ?? ''}
          className="input resize-none"
          rows={2}
          placeholder="Catatan tambahan..."
          maxLength={500}
        />
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
          ) : isEdit ? 'Simpan Perubahan' : 'Simpan'}
        </button>
        <button type="button" disabled={isPending} onClick={() => router.back()} className="btn-secondary">
          Batal
        </button>
      </div>
    </form>
  )
}
