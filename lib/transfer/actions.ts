'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createTransfer, deleteTransfer } from './queries'

export async function createTransferAction(formData: FormData) {
  const from_account_id = formData.get('from_account_id') as string | null
  const to_account_id = formData.get('to_account_id') as string | null
  const amountRaw = formData.get('amount') as string | null
  const amount = amountRaw ? parseInt(amountRaw.replace(/\D/g, ''), 10) : 0
  const transaction_date = (formData.get('transaction_date') as string | null)
    ?? new Date().toISOString().split('T')[0]
  const description = (formData.get('description') as string | null) ?? undefined

  if (!from_account_id) return { error: 'Rekening asal wajib dipilih' }
  if (!to_account_id) return { error: 'Rekening tujuan wajib dipilih' }
  if (from_account_id === to_account_id) return { error: 'Rekening asal dan tujuan tidak boleh sama' }
  if (!amount || amount <= 0) return { error: 'Nominal harus lebih dari 0' }

  try {
    await createTransfer({ from_account_id, to_account_id, amount, transaction_date, description })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gagal menyimpan transfer'
    return { error: msg }
  }

  revalidatePath('/transfer')
  revalidatePath('/rekening')
  revalidatePath('/dashboard')
  redirect('/transfer')
}

export async function deleteTransferAction(id: string) {
  try {
    await deleteTransfer(id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gagal menghapus transfer'
    return { error: msg }
  }

  revalidatePath('/transfer')
  revalidatePath('/rekening')
  revalidatePath('/dashboard')
  return { success: true }
}
