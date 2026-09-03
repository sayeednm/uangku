'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils/currency'
import CurrencyInput from '@/components/ui/CurrencyInput'
import CustomSelect from '@/components/ui/CustomSelect'
import type { AccountRow } from '@/lib/rekening/queries'

interface TransferFormProps {
  accounts: Pick<AccountRow, 'id' | 'name' | 'type'>[]
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

const today = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function TransferForm({ accounts, action }: TransferFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [amountDisplay, setAmountDisplay] = useState('')
  const [fromAccount, setFromAccount] = useState(accounts[0]?.id ?? '')
  const [toAccount, setToAccount] = useState(accounts[1]?.id ?? '')
  const [date, setDate] = useState(today())

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await action(formData)
      if (result && 'error' in result && result.error) setError(result.error)
    })
  }

  const accountOptions = accounts.map(a => ({ value: a.id, label: a.name }))

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Amount */}
      <div>
        <label className="label">Nominal</label>
        <CurrencyInput name="amount" disabled={isPending} autoFocus />
      </div>

      {/* From */}
      <div>
        <label className="label">Dari Rekening</label>
        <CustomSelect
          name="from_account_id"
          value={fromAccount}
          onChange={setFromAccount}
          placeholder="Pilih rekening asal"
          disabled={isPending}
          required
          options={accountOptions}
        />
      </div>

      {/* Arrow indicator */}
      <div className="flex justify-center">
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>

      {/* To */}
      <div>
        <label className="label">Ke Rekening</label>
        <CustomSelect
          name="to_account_id"
          value={toAccount}
          onChange={setToAccount}
          placeholder="Pilih rekening tujuan"
          disabled={isPending}
          required
          options={accountOptions}
        />
      </div>

      {/* Date */}
      <div>
        <label htmlFor="transaction_date" className="label">Tanggal</label>
        <input
          id="transaction_date" name="transaction_date" type="date"
          required disabled={isPending}
          value={date}
          onChange={e => setDate(e.target.value)}
          className="input [color-scheme:light] dark:[color-scheme:dark]"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="label">
          Keterangan <span className="text-gray-400 dark:text-gray-500 font-normal normal-case">(opsional)</span>
        </label>
        <input id="description" name="description" type="text" disabled={isPending}
          className="input" placeholder="Contoh: Top up e-wallet" maxLength={200} />
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
          ) : 'Simpan Transfer'}
        </button>
        <button type="button" disabled={isPending} onClick={() => router.back()} className="btn-secondary">
          Batal
        </button>
      </div>
    </form>
  )
}
