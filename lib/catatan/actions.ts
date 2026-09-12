'use server'

import { revalidatePath } from 'next/cache'
import {
  getNotes,
  createNote,
  updateNote,
  softDeleteNote,
  restoreNote,
  permanentDeleteNote,
  setNotePinned,
  setNoteArchived,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  getOrCreateTag,
  setNoteTags,
  setNoteTransactions,
  type CreateNoteInput,
  type NoteType,
  type NoteFinancialStatus,
  type NoteFilter,
  type NoteSort,
  type NoteWithRefs,
} from './queries'

const NOTE_TYPES: NoteType[] = ['general', 'hutang', 'piutang', 'tagihan', 'keuangan']
const FINANCIAL_STATUSES: NoteFinancialStatus[] = ['pending', 'paid', 'cancelled']

function parseNoteType(raw: unknown): NoteType {
  return NOTE_TYPES.includes(raw as NoteType) ? (raw as NoteType) : 'general'
}

function parseStatus(raw: unknown): NoteFinancialStatus | null {
  return FINANCIAL_STATUSES.includes(raw as NoteFinancialStatus)
    ? (raw as NoteFinancialStatus)
    : null
}

function parseAmount(raw: FormDataEntryValue | null): number | null {
  if (raw === null || raw === '') return null
  const n = parseInt(String(raw).replace(/\D/g, ''), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function revalidateNotes() {
  revalidatePath('/notes')
}

/**
 * Client-side list fetching for the notes page (filter/search/sort
 * without a full page reload). Returns plain JSON-serializable data.
 */
export async function fetchNotesAction(
  filter: NoteFilter,
  search?: string,
  sort?: NoteSort,
): Promise<{ notes: NoteWithRefs[]; error?: string }> {
  try {
    const notes = await getNotes(filter, search, sort)
    return { notes }
  } catch (e) {
    return { notes: [], error: e instanceof Error ? e.message : 'Gagal memuat catatan' }
  }
}

// ─── Note CRUD ────────────────────────────────────────────────────────────────

export interface SaveNoteInput {
  id?: string
  title?: string
  content?: string
  note_type?: NoteType
  amount?: number | null
  due_date?: string | null
  financial_status?: NoteFinancialStatus | null
}

/**
 * Create or update a note (JSON-style, used by the autosave editor).
 * Returns the note id so the editor can switch from create to update mode.
 */
export async function saveNoteAction(
  input: SaveNoteInput,
): Promise<{ id?: string; error?: string }> {
  const noteType = parseNoteType(input.note_type)

  const title = input.title?.slice(0, 200)
  const content = input.content?.slice(0, 20000)

  try {
    if (input.id) {
      await updateNote(input.id, {
        title: title ?? null,
        content: content ?? null,
        note_type: noteType,
        amount: noteType === 'general' ? null : (input.amount ?? null),
        due_date: noteType === 'general' ? null : (input.due_date || null),
        financial_status: noteType === 'general' ? null : (parseStatus(input.financial_status) ?? 'pending'),
      })
      revalidateNotes()
      revalidatePath(`/notes/${input.id}/edit`)
      return { id: input.id }
    }

    const created = await createNote({
      title,
      content,
      note_type: noteType,
      amount: noteType === 'general' ? null : (input.amount ?? null),
      due_date: noteType === 'general' ? null : (input.due_date || null),
      financial_status: noteType === 'general' ? null : (parseStatus(input.financial_status) ?? 'pending'),
    })
    revalidateNotes()
    return { id: created.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal menyimpan catatan' }
  }
}

export async function deleteNoteAction(id: string) {
  try {
    await softDeleteNote(id)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal memindahkan ke sampah' }
  }
  revalidateNotes()
  return { success: true }
}

export async function restoreNoteAction(id: string) {
  try {
    await restoreNote(id)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal memulihkan catatan' }
  }
  revalidateNotes()
  return { success: true }
}

export async function permanentDeleteNoteAction(id: string) {
  try {
    await permanentDeleteNote(id)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal menghapus catatan' }
  }
  revalidateNotes()
  return { success: true }
}

export async function pinNoteAction(id: string, pinned: boolean) {
  try {
    await setNotePinned(id, pinned)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal memperbarui catatan' }
  }
  revalidateNotes()
  return { success: true }
}

export async function archiveNoteAction(id: string, archived: boolean) {
  try {
    await setNoteArchived(id, archived)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal memperbarui catatan' }
  }
  revalidateNotes()
  return { success: true }
}

// ─── Checklist ────────────────────────────────────────────────────────────────

export async function addChecklistItemAction(noteId: string, content: string) {
  try {
    await addChecklistItem(noteId, content)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal menambah checklist' }
  }
  revalidateNotes()
  revalidatePath(`/notes/${noteId}/edit`)
  return { success: true }
}

export async function toggleChecklistItemAction(
  itemId: string,
  isCompleted: boolean,
  noteId: string,
) {
  try {
    await updateChecklistItem(itemId, { is_completed: isCompleted })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal memperbarui checklist' }
  }
  revalidateNotes()
  revalidatePath(`/notes/${noteId}/edit`)
  return { success: true }
}

export async function editChecklistItemAction(
  itemId: string,
  content: string,
  noteId: string,
) {
  if (!content.trim()) return { error: 'Isi checklist tidak boleh kosong' }
  try {
    await updateChecklistItem(itemId, { content })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal memperbarui checklist' }
  }
  revalidateNotes()
  revalidatePath(`/notes/${noteId}/edit`)
  return { success: true }
}

export async function deleteChecklistItemAction(itemId: string, noteId: string) {
  try {
    await deleteChecklistItem(itemId)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal menghapus checklist' }
  }
  revalidateNotes()
  revalidatePath(`/notes/${noteId}/edit`)
  return { success: true }
}

/** Move a checklist item within its note (swap positions via sort_order). */
export async function reorderChecklistItemAction(
  noteId: string,
  itemId: string,
  direction: 'up' | 'down',
) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data: items, error } = await supabase
      .from('checklist_items')
      .select('id, sort_order')
      .eq('note_id', noteId)
      .order('sort_order', { ascending: true })

    if (error) throw error
    if (!items) return { success: true }

    const index = items.findIndex(i => i.id === itemId)
    const swapWith = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || swapWith < 0 || swapWith >= items.length) return { success: true }

    const a = items[index]
    const b = items[swapWith]

    await supabase.from('checklist_items').update({ sort_order: b.sort_order }).eq('id', a.id)
    await supabase.from('checklist_items').update({ sort_order: a.sort_order }).eq('id', b.id)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal mengurutkan checklist' }
  }
  revalidateNotes()
  revalidatePath(`/notes/${noteId}/edit`)
  return { success: true }
}

// ─── Tags & linked transactions ───────────────────────────────────────────────

/** Replace all tags of a note with the given tag names (get-or-create). */
export async function setNoteTagsAction(
  noteId: string,
  tagNames: string[],
): Promise<{ error?: string }> {
  try {
    const cleanNames = [...new Set(tagNames.map(t => t.trim().replace(/^#/, '')).filter(Boolean))]
    if (cleanNames.length > 10) return { error: 'Maksimal 10 tag per catatan' }

    const tagIds = await Promise.all(cleanNames.map(name => getOrCreateTag(name)))
    await setNoteTags(noteId, tagIds)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal menyimpan tag' }
  }
  revalidateNotes()
  revalidatePath(`/notes/${noteId}/edit`)
  return {}
}

/** Replace the linked transactions of a note. */
export async function setNoteTransactionsAction(
  noteId: string,
  transactionIds: string[],
): Promise<{ error?: string }> {
  try {
    await setNoteTransactions(noteId, [...new Set(transactionIds)])
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal menautkan transaksi' }
  }
  revalidateNotes()
  revalidatePath(`/notes/${noteId}/edit`)
  return {}
}
