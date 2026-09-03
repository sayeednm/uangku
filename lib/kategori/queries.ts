/**
 * Kategori (Category) queries.
 * All queries use the server Supabase client — RLS enforced.
 */

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

export type CategoryRow = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryType = 'income' | 'expense'

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all categories visible to the user:
 * - default categories (is_default = true, user_id = null)
 * - user's own custom categories
 * Both non-archived only.
 */
export async function getCategories(): Promise<CategoryRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_archived', false)
    .order('is_default', { ascending: false }) // defaults first
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getCategoriesByType(type: CategoryType): Promise<CategoryRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('type', type)
    .eq('is_archived', false)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getCategoryById(id: string): Promise<CategoryRow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

// ─── Write (user categories only — default categories are read-only) ──────────

export interface CreateCategoryInput {
  name: string
  type: CategoryType
  icon?: string
  color?: string
}

export async function createCategory(input: CreateCategoryInput): Promise<CategoryRow> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak terautentikasi')

  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      type: input.type,
      icon: input.icon ?? null,
      color: input.color ?? null,
      is_default: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export interface UpdateCategoryInput {
  name?: string
  icon?: string | null
  color?: string | null
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<CategoryRow> {
  const supabase = await createClient()

  const update: Record<string, unknown> = {}
  if (input.name !== undefined) update.name = input.name.trim()
  if (input.icon !== undefined) update.icon = input.icon
  if (input.color !== undefined) update.color = input.color

  const { data, error } = await supabase
    .from('categories')
    .update(update)
    .eq('id', id)
    .eq('is_default', false) // safety: never update default categories
    .select()
    .single()

  if (error) throw error
  return data
}

export async function archiveCategory(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('categories')
    .update({ is_archived: true })
    .eq('id', id)
    .eq('is_default', false)

  if (error) throw error
}

export async function unarchiveCategory(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('categories')
    .update({ is_archived: false })
    .eq('id', id)
    .eq('is_default', false)

  if (error) throw error
}
