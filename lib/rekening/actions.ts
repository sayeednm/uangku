'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createAccount,
  updateAccount,
  archiveAccount,
  unarchiveAccount,
  type CreateAccountInput,
  type UpdateAccountInput,
} from './queries'

export async function createAccountAction(formData: FormData) {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const type = formData.get('type') as CreateAccountInput['type']
  const balanceRaw = formData.get('initial_balance') as string | null
  const initial_balance = balanceRaw ? parseInt(balanceRaw.replace(/\D/g, ''), 10) : 0

  if (!name) return { error: 'Nama rekening wajib diisi' }
  if (!type) return { error: 'Tipe rekening wajib dipilih' }
  if (isNaN(initial_balance) || initial_balance < 0) return { error: 'Saldo awal tidak valid' }

  try {
    await createAccount({ name, type, initial_balance })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gagal membuat rekening'
    if (msg.includes('unique')) return { error: 'Nama rekening sudah digunakan' }
    return { error: msg }
  }

  revalidatePath('/rekening')
  revalidatePath('/dashboard')
  redirect('/rekening?success=Rekening+berhasil+ditambahkan')
}

export async function updateAccountAction(id: string, formData: FormData) {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const type = formData.get('type') as UpdateAccountInput['type']
  const balanceRaw = formData.get('initial_balance') as string | null
  const initial_balance = balanceRaw ? parseInt(balanceRaw.replace(/\D/g, ''), 10) : 0

  if (!name) return { error: 'Nama rekening wajib diisi' }
  if (isNaN(initial_balance) || initial_balance < 0) return { error: 'Saldo awal tidak valid' }

  try {
    await updateAccount(id, { name, type, initial_balance })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gagal memperbarui rekening'
    if (msg.includes('unique')) return { error: 'Nama rekening sudah digunakan' }
    return { error: msg }
  }

  revalidatePath('/rekening')
  revalidatePath('/dashboard')
  redirect('/rekening?success=Rekening+berhasil+diperbarui')
}

export async function archiveAccountAction(id: string) {
  try {
    await archiveAccount(id)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal mengarsipkan rekening' }
  }
  revalidatePath('/rekening')
  revalidatePath('/dashboard')
  return { success: true, message: 'Rekening diarsipkan' }
}

export async function unarchiveAccountAction(id: string) {
  try {
    await unarchiveAccount(id)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal mengaktifkan rekening' }
  }
  revalidatePath('/rekening')
  revalidatePath('/dashboard')
  return { success: true, message: 'Rekening diaktifkan' }
}
