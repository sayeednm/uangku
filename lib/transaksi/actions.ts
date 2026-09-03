'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  type CreateTransactionInput,
} from './queries'

function parseAmount(raw: string | null): number {
  if (!raw) return 0
  return parseInt(raw.replace(/\D/g, ''), 10) || 0
}

function parseDate(raw: string | null): string {
  if (!raw) return new Date().toISOString().split('T')[0]
  return raw
}

export async function createTransactionAction(formData: FormData) {
  const type = formData.get('type') as CreateTransactionInput['type']
  const amount = parseAmount(formData.get('amount') as string | null)
  const account_id = formData.get('account_id') as string | null
  const category_id = formData.get('category_id') as string | null
  const transaction_date = parseDate(formData.get('transaction_date') as string | null)
  const description = (formData.get('description') as string | null) ?? undefined
  const note = (formData.get('note') as string | null) ?? undefined

  if (!type || (type !== 'income' && type !== 'expense')) return { error: 'Jenis transaksi tidak valid' }
  if (!amount || amount <= 0) return { error: 'Nominal harus lebih dari 0' }
  if (!account_id) return { error: 'Rekening wajib dipilih' }
  if (!category_id) return { error: 'Kategori wajib dipilih' }

  try {
    await createTransaction({ type, amount, account_id, category_id, transaction_date, description, note })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal menyimpan transaksi' }
  }

  revalidatePath('/transaksi')
  revalidatePath('/dashboard')
  const label = type === 'income' ? 'Pemasukan' : 'Pengeluaran'
  redirect(`/transaksi?success=${label}+berhasil+dicatat`)
}

export async function updateTransactionAction(id: string, formData: FormData) {
  const type = formData.get('type') as CreateTransactionInput['type']
  const amount = parseAmount(formData.get('amount') as string | null)
  const account_id = formData.get('account_id') as string | null
  const category_id = formData.get('category_id') as string | null
  const transaction_date = parseDate(formData.get('transaction_date') as string | null)
  const description = (formData.get('description') as string | null) ?? undefined
  const note = (formData.get('note') as string | null) ?? undefined

  if (!amount || amount <= 0) return { error: 'Nominal harus lebih dari 0' }
  if (!account_id) return { error: 'Rekening wajib dipilih' }
  if (!category_id) return { error: 'Kategori wajib dipilih' }

  try {
    await updateTransaction(id, { type, amount, account_id, category_id, transaction_date, description, note })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal memperbarui transaksi' }
  }

  revalidatePath('/transaksi')
  revalidatePath('/dashboard')
  redirect('/transaksi?success=Transaksi+berhasil+diperbarui')
}

export async function deleteTransactionAction(id: string) {
  try {
    await deleteTransaction(id)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal menghapus transaksi' }
  }
  revalidatePath('/transaksi')
  revalidatePath('/dashboard')
  return { success: true }
}
