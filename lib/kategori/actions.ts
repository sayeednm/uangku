'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createCategory, updateCategory, archiveCategory, unarchiveCategory } from './queries'
import type { CategoryType } from './queries'

export async function createCategoryAction(formData: FormData) {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const type = formData.get('type') as CategoryType | null
  const icon = (formData.get('icon') as string | null)?.trim() || undefined

  if (!name) return { error: 'Nama kategori wajib diisi' }
  if (!type || (type !== 'income' && type !== 'expense'))
    return { error: 'Tipe kategori tidak valid' }

  try {
    await createCategory({ name, type, icon })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gagal membuat kategori'
    if (msg.includes('unique')) return { error: 'Nama kategori sudah ada untuk tipe ini' }
    return { error: msg }
  }

  revalidatePath('/kategori')
  redirect('/kategori')
}

export async function updateCategoryAction(id: string, formData: FormData) {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const icon = (formData.get('icon') as string | null)?.trim() || null

  if (!name) return { error: 'Nama kategori wajib diisi' }

  try {
    await updateCategory(id, { name, icon })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gagal memperbarui kategori'
    if (msg.includes('unique')) return { error: 'Nama kategori sudah ada untuk tipe ini' }
    return { error: msg }
  }

  revalidatePath('/kategori')
  redirect('/kategori')
}

export async function archiveCategoryAction(id: string) {
  try {
    await archiveCategory(id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gagal mengarsipkan kategori'
    return { error: msg }
  }
  revalidatePath('/kategori')
  return { success: true }
}

export async function unarchiveCategoryAction(id: string) {
  try {
    await unarchiveCategory(id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gagal mengaktifkan kategori'
    return { error: msg }
  }
  revalidatePath('/kategori')
  return { success: true }
}
