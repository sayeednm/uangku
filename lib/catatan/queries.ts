/**
 * Catatan (Notes) queries.
 * All queries use the server Supabase client — RLS enforced.
 */

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

export type NoteRow = Database['public']['Tables']['notes']['Row']
export type NoteInsert = Database['public']['Tables']['notes']['Insert']
export type NoteType = Database['public']['Enums']['note_type']
export type NoteFinancialStatus = Database['public']['Enums']['note_financial_status']
export type TagRow = Database['public']['Tables']['tags']['Row']
export type ChecklistItemRow = Database['public']['Tables']['checklist_items']['Row']

export interface NoteWithRefs extends NoteRow {
  checklist: ChecklistItemRow[]
  tags: TagRow[]
  transactions: {
    id: string
    type: string
    amount: number
    description: string | null
    transaction_date: string
  }[]
}

export type NoteFilter = 'all' | 'pinned' | 'archived' | 'trash'
export type NoteSort = 'recently_updated' | 'recently_created' | 'oldest'

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * List notes for the current user with checklist counts and tag names.
 * `filter` controls bucket: all (default), pinned, archived, trash.
 */
export async function getNotes(
  filter: NoteFilter = 'all',
  search?: string,
  sort: NoteSort = 'recently_updated',
): Promise<NoteWithRefs[]> {
  const supabase = await createClient()

  let query = supabase
    .from('notes')
    .select(`
      *,
      checklist:checklist_items ( id, note_id, content, is_completed, sort_order, created_at, updated_at ),
      tags:note_tags ( tag:tags ( id, user_id, name, created_at ) ),
      transactions:note_transactions ( transaction:transactions ( id, type, amount, description, transaction_date ) )
    `)

  switch (filter) {
    case 'trash':
      query = query.not('deleted_at', 'is', null)
      break
    case 'archived':
      query = query.is('deleted_at', null).eq('is_archived', true)
      break
    case 'pinned':
      query = query.is('deleted_at', null).eq('is_archived', false).eq('is_pinned', true)
      break
    case 'all':
    default:
      query = query.is('deleted_at', null).eq('is_archived', false)
  }

  if (search && search.trim()) {
    // Strip characters that break PostgREST .or() syntax
    const term = search.trim().replace(/[%_,()]/g, ' ')
    query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%`)
  }

  switch (sort) {
    case 'recently_created':
      query = query.order('created_at', { ascending: false })
      break
    case 'oldest':
      query = query.order('created_at', { ascending: true })
      break
    case 'recently_updated':
    default:
      query = query.order('updated_at', { ascending: false })
  }

  const { data, error } = await query

  if (error) throw error

  return (data ?? []).map(normalizeNote)
}

export async function getNoteById(id: string): Promise<NoteWithRefs | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notes')
    .select(`
      *,
      checklist:checklist_items ( id, note_id, content, is_completed, sort_order, created_at, updated_at ),
      tags:note_tags ( tag:tags ( id, user_id, name, created_at ) ),
      transactions:note_transactions ( transaction:transactions ( id, type, amount, description, transaction_date ) )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data ? normalizeNote(data) : null
}

/** Flatten PostgREST nested join shape into NoteWithRefs. */
function normalizeNote(row: Record<string, unknown>): NoteWithRefs {
  const tags = (row.tags as { tag: TagRow }[] | null)?.map(t => t.tag).filter(Boolean) ?? []
  const transactions = (
    row.transactions as {
      transaction: { id: string; type: string; amount: number; description: string | null; transaction_date: string }
    }[] | null
  )?.map(t => t.transaction).filter(Boolean) ?? []

  const { tags: _t, transactions: _tr, ...note } = row as NoteRow & { tags: unknown; transactions: unknown }

  return {
    ...(note as NoteRow),
    checklist: ((row.checklist as ChecklistItemRow[] | null) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
    ),
    tags,
    transactions,
  }
}

/** All tags of the current user (for the editor's tag picker). */
export async function getUserTags(): Promise<TagRow[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak terautentikasi')

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** User's transactions for the link picker (most recent first). */
export async function getRecentTransactions(limit = 20) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak terautentikasi')

  const { data, error } = await supabase
    .from('transactions')
    .select('id, type, amount, description, transaction_date')
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

// ─── Write ────────────────────────────────────────────────────────────────────

export interface CreateNoteInput {
  title?: string
  content?: string
  note_type?: NoteType
  amount?: number | null
  due_date?: string | null
  financial_status?: NoteFinancialStatus | null
}

export async function createNote(input: CreateNoteInput): Promise<NoteRow> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak terautentikasi')

  const title = input.title?.trim() || null
  const content = input.content?.trim() || null
  if (!title && !content) throw new Error('Catatan tidak boleh kosong')

  const noteType: NoteType = input.note_type ?? 'general'

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: user.id,
      title,
      content,
      note_type: noteType,
      amount: noteType === 'general' ? null : (input.amount ?? null),
      due_date: noteType === 'general' ? null : (input.due_date || null),
      financial_status: noteType === 'general' ? null : (input.financial_status ?? 'pending'),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export interface UpdateNoteInput {
  title?: string | null
  content?: string | null
  note_type?: NoteType
  amount?: number | null
  due_date?: string | null
  financial_status?: NoteFinancialStatus | null
}

export async function updateNote(id: string, input: UpdateNoteInput): Promise<NoteRow> {
  const supabase = await createClient()

  const update: Record<string, unknown> = {}
  if (input.title !== undefined) update.title = input.title?.trim() || null
  if (input.content !== undefined) update.content = input.content?.trim() || null
  if (input.note_type !== undefined) update.note_type = input.note_type
  if (input.amount !== undefined) update.amount = input.amount
  if (input.due_date !== undefined) update.due_date = input.due_date || null
  if (input.financial_status !== undefined) update.financial_status = input.financial_status

  const { data, error } = await supabase
    .from('notes')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function softDeleteNote(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function restoreNote(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notes')
    .update({ deleted_at: null })
    .eq('id', id)

  if (error) throw error
}

export async function permanentDeleteNote(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function setNotePinned(id: string, pinned: boolean): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notes')
    .update({ is_pinned: pinned })
    .eq('id', id)

  if (error) throw error
}

export async function setNoteArchived(id: string, archived: boolean): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notes')
    .update({ is_archived: archived })
    .eq('id', id)

  if (error) throw error
}

// ─── Checklist ────────────────────────────────────────────────────────────────

export async function addChecklistItem(noteId: string, content: string): Promise<ChecklistItemRow> {
  const supabase = await createClient()

  const trimmed = content.trim()
  if (!trimmed) throw new Error('Isi checklist tidak boleh kosong')

  // Determine next sort_order
  const { data: maxRow } = await supabase
    .from('checklist_items')
    .select('sort_order')
    .eq('note_id', noteId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from('checklist_items')
    .insert({
      note_id: noteId,
      content: trimmed,
      sort_order: (maxRow?.sort_order ?? -1) + 1,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateChecklistItem(
  itemId: string,
  input: { content?: string; is_completed?: boolean; sort_order?: number },
): Promise<void> {
  const supabase = await createClient()

  const update: Record<string, unknown> = {}
  if (input.content !== undefined) update.content = input.content.trim()
  if (input.is_completed !== undefined) update.is_completed = input.is_completed
  if (input.sort_order !== undefined) update.sort_order = input.sort_order

  const { error } = await supabase
    .from('checklist_items')
    .update(update)
    .eq('id', itemId)

  if (error) throw error
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('checklist_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

/** Find-or-create a tag by name for the current user, returns tag id. */
export async function getOrCreateTag(name: string): Promise<string> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak terautentikasi')

  const clean = name.trim().replace(/^#/, '').slice(0, 50)
  if (!clean) throw new Error('Nama tag tidak valid')

  const lower = clean.toLowerCase()

  // Case-insensitive match against the user's tags
  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('user_id', user.id)
    .ilike('name', lower)
    .maybeSingle()

  if (existing) return existing.id

  // Unique-violation fallback (concurrent create)
  const { data: created, error } = await supabase
    .from('tags')
    .insert({ user_id: user.id, name: clean })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      const { data: retry } = await supabase
        .from('tags')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', lower)
        .maybeSingle()
      if (retry) return retry.id
    }
    throw error
  }
  return created.id
}

/** Replace the tag set of a note. */
export async function setNoteTags(noteId: string, tagIds: string[]): Promise<void> {
  const supabase = await createClient()

  // Fetch current links
  const { data: current } = await supabase
    .from('note_tags')
    .select('tag_id')
    .eq('note_id', noteId)

  const currentIds = new Set((current ?? []).map(r => r.tag_id))
  const targetIds = new Set(tagIds)

  const toAdd = [...targetIds].filter(id => !currentIds.has(id))
  const toRemove = [...currentIds].filter(id => !targetIds.has(id))

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('note_tags')
      .insert(toAdd.map(tag_id => ({ note_id: noteId, tag_id })))
    if (error) throw error
  }

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('note_tags')
      .delete()
      .eq('note_id', noteId)
      .in('tag_id', toRemove)
    if (error) throw error
  }
}

// ─── Linked transactions ──────────────────────────────────────────────────────

/** Replace the linked-transaction set of a note. */
export async function setNoteTransactions(noteId: string, transactionIds: string[]): Promise<void> {
  const supabase = await createClient()

  const { data: current } = await supabase
    .from('note_transactions')
    .select('transaction_id')
    .eq('note_id', noteId)

  const currentIds = new Set((current ?? []).map(r => r.transaction_id))
  const targetIds = new Set(transactionIds)

  const toAdd = [...targetIds].filter(id => !currentIds.has(id))
  const toRemove = [...currentIds].filter(id => !targetIds.has(id))

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('note_transactions')
      .insert(toAdd.map(transaction_id => ({ note_id: noteId, transaction_id })))
    if (error) throw error
  }

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('note_transactions')
      .delete()
      .eq('note_id', noteId)
      .in('transaction_id', toRemove)
    if (error) throw error
  }
}
