'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/ui/BackButton'
import ConfirmSheet from '@/components/ui/ConfirmSheet'
import CustomSelect from '@/components/ui/CustomSelect'
import {
  saveNoteAction,
  deleteNoteAction,
  pinNoteAction,
  archiveNoteAction,
  addChecklistItemAction,
  toggleChecklistItemAction,
  editChecklistItemAction,
  deleteChecklistItemAction,
  reorderChecklistItemAction,
  setNoteTagsAction,
  setNoteTransactionsAction,
} from '@/lib/catatan/actions'
import type { NoteWithRefs, NoteType, NoteFinancialStatus } from '@/lib/catatan/queries'

interface TagOption { id: string; name: string }
interface TxOption {
  id: string
  type: string
  amount: number
  description: string | null
  transaction_date: string
}

interface NoteEditorProps {
  note?: NoteWithRefs
  allTags: TagOption[]
  recentTransactions: TxOption[]
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const NOTE_TYPE_OPTIONS = [
  { value: 'general', label: 'Umum' },
  { value: 'hutang', label: 'Hutang' },
  { value: 'piutang', label: 'Piutang' },
  { value: 'tagihan', label: 'Tagihan' },
  { value: 'keuangan', label: 'Keuangan' },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Belum Lunas' },
  { value: 'paid', label: 'Lunas' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

const AUTOSAVE_DELAY = 800

function formatAmount(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function NoteEditor({ note, allTags, recentTransactions }: NoteEditorProps) {
  const router = useRouter()
  const isEdit = !!note

  // ── Note fields (autosaved) ──────────────────────────────────────────────
  const [noteId, setNoteId] = useState<string | undefined>(note?.id)
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [noteType, setNoteType] = useState<NoteType>(note?.note_type ?? 'general')
  const [amount, setAmount] = useState<number | null>(note?.amount ?? null)
  const [dueDate, setDueDate] = useState(note?.due_date ?? '')
  const [financialStatus, setFinancialStatus] = useState<NoteFinancialStatus | null>(
    note?.financial_status ?? null
  )
  const [tagNames, setTagNames] = useState<string[]>(note?.tags.map(t => t.name) ?? [])
  const [linkedTx, setLinkedTx] = useState<string[]>(note?.transactions.map(t => t.id) ?? [])

  // ── Meta state (saved immediately) ───────────────────────────────────────
  const [isPinned, setIsPinned] = useState(note?.is_pinned ?? false)
  const [isArchived, setIsArchived] = useState(note?.is_archived ?? false)

  // ── Checklist state (saved immediately per operation) ────────────────────
  const [checklist, setChecklist] = useState(note?.checklist ?? [])
  const [newItem, setNewItem] = useState('')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')

  // ── Save machinery ───────────────────────────────────────────────────────
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const savingRef = useRef(false)
  const pendingSaveRef = useRef(false)
  const skipAutosaveRef = useRef(true) // skip the very first render
  const dirtyRef = useRef(false)
  const tagInputRef = useRef<HTMLInputElement>(null)

  const isFinancial = noteType !== 'general'

  const performSave = async () => {
    if (savingRef.current) {
      pendingSaveRef.current = true
      return
    }
    savingRef.current = true
    setSaveState('saving')
    setSaveError(null)

    try {
      const result = await saveNoteAction({
        id: noteId,
        title: title.trim() || undefined,
        content: content.trim() || undefined,
        note_type: noteType,
        amount: isFinancial ? amount : null,
        due_date: isFinancial ? (dueDate || null) : null,
        financial_status: isFinancial ? (financialStatus ?? 'pending') : null,
      })

      if (result.error) {
        setSaveState('error')
        setSaveError(result.error)
        return
      }

      // First save of a new note — adopt its id and fix the URL without navigation
      if (!noteId && result.id) {
        setNoteId(result.id)
        window.history.replaceState(null, '', `/notes/${result.id}/edit`)
      }

      // Persist tags + linked transactions alongside the note
      if (result.id) {
        const [tagResult, txResult] = await Promise.all([
          setNoteTagsAction(result.id, tagNames),
          setNoteTransactionsAction(result.id, linkedTx),
        ])
        if (tagResult.error || txResult.error) {
          setSaveState('error')
          setSaveError(tagResult.error ?? txResult.error ?? null)
          return
        }
      }

      dirtyRef.current = false
      setSaveState('saved')
    } catch {
      setSaveState('error')
      setSaveError('Gagal menyimpan catatan')
    } finally {
      savingRef.current = false
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false
        performSave()
      }
    }
  }

  // Debounced autosave
  useEffect(() => {
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false
      return
    }
    dirtyRef.current = true
    const t = setTimeout(() => { performSave() }, AUTOSAVE_DELAY)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, noteType, amount, dueDate, financialStatus, tagNames, linkedTx])

  // Mirror latest field values so the unmount save never uses stale state
  const latestStateRef = useRef({ noteId, title, content, noteType, amount, dueDate, financialStatus })
  latestStateRef.current = { noteId, title, content, noteType, amount, dueDate, financialStatus }

  // Final fire-and-forget save on unmount if dirty and non-empty
  useEffect(() => {
    return () => {
      const s = latestStateRef.current
      if (dirtyRef.current && (s.title.trim() || s.content.trim())) {
        saveNoteAction({
          id: s.noteId,
          title: s.title.trim() || undefined,
          content: s.content.trim() || undefined,
          note_type: s.noteType,
          amount: s.noteType === 'general' ? null : s.amount,
          due_date: s.noteType === 'general' ? null : (s.dueDate || null),
          financial_status: s.noteType === 'general' ? null : (s.financialStatus ?? 'pending'),
        })
      }
    }
  }, [])

  // ── Meta actions ─────────────────────────────────────────────────────────
  const [isPending, startTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const togglePin = () => {
    if (!noteId) return
    const next = !isPinned
    setIsPinned(next)
    startTransition(async () => {
      const result = await pinNoteAction(noteId, next)
      if (result && 'error' in result && result.error) setIsPinned(!next)
    })
  }

  const toggleArchive = () => {
    if (!noteId) return
    const next = !isArchived
    setIsArchived(next)
    startTransition(async () => {
      const result = await archiveNoteAction(noteId, next)
      if (result && 'error' in result && result.error) {
        setIsArchived(!next)
        return
      }
      router.push('/notes')
    })
  }

  const handleDelete = () => {
    if (!noteId) return
    startTransition(async () => {
      const result = await deleteNoteAction(noteId)
      if (result && 'error' in result && result.error) return
      router.push('/notes')
    })
  }

  // ── Checklist operations ─────────────────────────────────────────────────
  const runChecklist = (fn: () => Promise<{ error?: string }>, after: () => void) => {
    startTransition(async () => {
      // Checklist needs a persisted note — save first if new
      let id = noteId
      if (!id) {
        const result = await saveNoteAction({
          title: title.trim() || undefined,
          content: content.trim() || undefined,
          note_type: noteType,
          amount: noteType === 'general' ? null : amount,
          due_date: noteType === 'general' ? null : (dueDate || null),
          financial_status: noteType === 'general' ? null : (financialStatus ?? 'pending'),
        })
        if (result.error || !result.id) return
        id = result.id
        setNoteId(id)
        window.history.replaceState(null, '', `/notes/${id}/edit`)
      }
      const result = await fn()
      if (result && 'error' in result && result.error) return
      after()
    })
  }

  const addChecklist = () => {
    const value = newItem.trim()
    if (!value) return
    runChecklist(
      () => addChecklistItemAction(noteId ?? '', value),
      () => {
        setChecklist(prev => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            note_id: noteId ?? '',
            content: value,
            is_completed: false,
            sort_order: prev.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        setNewItem('')
      }
    )
  }

  const toggleChecklist = (itemId: string, noteIdForCall: string) => {
    const item = checklist.find(c => c.id === itemId)
    if (!item) return
    const next = !item.is_completed
    setChecklist(prev => prev.map(c => (c.id === itemId ? { ...c, is_completed: next } : c)))
    runChecklist(
      () => toggleChecklistItemAction(itemId, next, noteIdForCall),
      () => {}
    )
  }

  const saveChecklistEdit = (itemId: string, noteIdForCall: string) => {
    const value = editingContent.trim()
    if (!value) return
    setChecklist(prev => prev.map(c => (c.id === itemId ? { ...c, content: value } : c)))
    setEditingItemId(null)
    runChecklist(
      () => editChecklistItemAction(itemId, value, noteIdForCall),
      () => {}
    )
  }

  const removeChecklist = (itemId: string, noteIdForCall: string) => {
    setChecklist(prev => prev.filter(c => c.id !== itemId))
    runChecklist(
      () => deleteChecklistItemAction(itemId, noteIdForCall),
      () => {}
    )
  }

  const reorderChecklist = (itemId: string, direction: 'up' | 'down', noteIdForCall: string) => {
    const index = checklist.findIndex(c => c.id === itemId)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= checklist.length) return

    const next = [...checklist]
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    setChecklist(next)

    runChecklist(
      () => reorderChecklistItemAction(noteIdForCall, itemId, direction),
      () => {}
    )
  }

  // ── Tags ─────────────────────────────────────────────────────────────────
  const addTag = () => {
    const input = tagInputRef.current
    if (!input) return
    const value = input.value.trim().replace(/^#/, '')
    if (!value) return
    if (tagNames.some(t => t.toLowerCase() === value.toLowerCase())) {
      input.value = ''
      return
    }
    if (tagNames.length >= 10) return
    setTagNames(prev => [...prev, value])
    input.value = ''
  }

  const removeTag = (name: string) => {
    setTagNames(prev => prev.filter(t => t !== name))
  }

  // ── Linked transactions ──────────────────────────────────────────────────
  const toggleLinkedTx = (txId: string) => {
    setLinkedTx(prev => (prev.includes(txId) ? prev.filter(id => id !== txId) : [...prev, txId]))
  }

  const doneCount = checklist.filter(c => c.is_completed).length

  const saveIndicator = (
    <span
      className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0"
      role="status"
      aria-live="polite"
    >
      {saveState === 'saving' && 'Menyimpan...'}
      {saveState === 'saved' && 'Tersimpan'}
      {saveState === 'error' && 'Gagal menyimpan'}
      {saveState === 'idle' && isEdit && 'Tersimpan'}
    </span>
  )

  return (
    <div className="max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton href="/notes" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
            {isEdit ? 'Edit Catatan' : 'Catatan Baru'}
          </h1>
        </div>
        {saveIndicator}
      </div>

      {saveError && (
        <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm" role="alert">
          {saveError}
        </div>
      )}

      {/* Type */}
      <div className="mb-4">
        <label htmlFor="note-type" className="label">Tipe Catatan</label>
        <CustomSelect
          id="note-type"
          name="note_type"
          value={noteType}
          onChange={v => setNoteType(v as NoteType)}
          options={NOTE_TYPE_OPTIONS}
        />
      </div>

      {/* Title */}
      <div className="mb-4">
        <label htmlFor="note-title" className="label">Judul</label>
        <input
          id="note-title"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="input"
          placeholder="Contoh: Hutang ke Budi"
          maxLength={200}
        />
      </div>

      {/* Content */}
      <div className="mb-4">
        <label htmlFor="note-content" className="label">Isi Catatan</label>
        <textarea
          id="note-content"
          value={content}
          onChange={e => setContent(e.target.value)}
          className="input resize-y min-h-32"
          placeholder="Tulis catatanmu di sini..."
          rows={6}
          maxLength={20000}
        />
      </div>

      {/* Financial fields — only for financial note types */}
      {isFinancial && (
        <div className="mb-4 space-y-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.07] rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Detail Keuangan
          </p>

          <div>
            <label htmlFor="note-amount" className="label">Nominal</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500 pointer-events-none font-medium">
                Rp
              </span>
              <input
                id="note-amount"
                type="text"
                inputMode="numeric"
                value={amount != null ? amount.toString() : ''}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '')
                  setAmount(digits ? parseInt(digits, 10) : null)
                }}
                className="input pl-10"
                placeholder="0"
                aria-label="Nominal dalam Rupiah"
              />
            </div>
          </div>

          <div>
            <label htmlFor="note-due" className="label">Jatuh Tempo</label>
            <input
              id="note-due"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="input [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>

          <div>
            <label htmlFor="note-status" className="label">Status</label>
            <CustomSelect
              id="note-status"
              name="financial_status"
              value={financialStatus ?? 'pending'}
              onChange={v => setFinancialStatus(v as NoteFinancialStatus)}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="label !mb-0">Checklist</p>
          {checklist.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {doneCount}/{checklist.length} selesai
            </p>
          )}
        </div>

        {checklist.length > 0 && (
          <ul className="space-y-1 mb-2">
            {checklist.map((item, index) => (
              <li key={item.id} className="flex items-center gap-2 group">
                <button
                  type="button"
                  onClick={() => toggleChecklist(item.id, item.note_id)}
                  disabled={isPending}
                  className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center transition-colors ${
                    item.is_completed
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-gray-300 dark:border-gray-600 hover:border-emerald-500'
                  }`}
                  aria-label={item.is_completed ? `Tandai ${item.content} belum selesai` : `Tandai ${item.content} selesai`}
                  aria-pressed={item.is_completed}
                >
                  {item.is_completed && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {editingItemId === item.id ? (
                  <input
                    type="text"
                    value={editingContent}
                    onChange={e => setEditingContent(e.target.value)}
                    onBlur={() => saveChecklistEdit(item.id, item.note_id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveChecklistEdit(item.id, item.note_id)
                      if (e.key === 'Escape') setEditingItemId(null)
                    }}
                    className="input !py-1.5 flex-1 min-w-0 text-sm"
                    autoFocus
                    aria-label="Edit isi checklist"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => { setEditingItemId(item.id); setEditingContent(item.content) }}
                    className={`flex-1 min-w-0 text-left text-sm truncate py-1 ${
                      item.is_completed
                        ? 'line-through text-gray-400 dark:text-gray-500'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {item.content}
                  </button>
                )}

                <div className="flex items-center flex-shrink-0 opacity-60 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => reorderChecklist(item.id, 'up', item.note_id)}
                    disabled={index === 0 || isPending}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
                    aria-label="Naikkan checklist"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => reorderChecklist(item.id, 'down', item.note_id)}
                    disabled={index === checklist.length - 1 || isPending}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
                    aria-label="Turunkan checklist"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeChecklist(item.id, item.note_id)}
                    disabled={isPending}
                    className="p-1 rounded text-gray-400 hover:text-red-500"
                    aria-label="Hapus checklist"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChecklist() } }}
            className="input flex-1 min-w-0"
            placeholder="Tambah item checklist..."
            aria-label="Item checklist baru"
            maxLength={500}
          />
          <button
            type="button"
            onClick={addChecklist}
            disabled={!newItem.trim() || isPending}
            className="btn-secondary flex-shrink-0"
            aria-label="Tambah checklist"
          >
            Tambah
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="mb-4">
        <label htmlFor="note-tags" className="label">Tag</label>
        {tagNames.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {tagNames.map(name => (
              <span
                key={name}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/[0.07] text-gray-700 dark:text-gray-200"
              >
                #{name}
                <button
                  type="button"
                  onClick={() => removeTag(name)}
                  className="text-gray-400 hover:text-red-500"
                  aria-label={`Hapus tag ${name}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={tagInputRef}
            id="note-tags"
            type="text"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
            className="input flex-1 min-w-0"
            placeholder="Tambah tag, misal: pribadi"
            aria-label="Tag baru"
            list="tag-suggestions"
            maxLength={50}
          />
          <datalist id="tag-suggestions">
            {allTags.map(t => <option key={t.id} value={t.name} />)}
          </datalist>
          <button type="button" onClick={addTag} className="btn-secondary flex-shrink-0" aria-label="Tambah tag">
            Tambah
          </button>
        </div>
      </div>

      {/* Linked transactions */}
      {recentTransactions.length > 0 && (
        <div className="mb-4">
          <p className="label">Transaksi Terhubung</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 -mt-1">
            Opsional — hubungkan catatan ini dengan transaksi terbaru
          </p>
          <div className="card divide-y divide-gray-100 dark:border-white/[0.07] dark:divide-white/[0.05] max-h-64 overflow-y-auto">
            {recentTransactions.map(tx => (
              <label
                key={tx.id}
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={linkedTx.includes(tx.id)}
                  onChange={() => toggleLinkedTx(tx.id)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 accent-[#1d6af5]"
                  aria-label={`Hubungkan transaksi ${tx.description ?? formatAmount(tx.amount)}`}
                />
                <span className="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-200 truncate">
                  {tx.description ?? (tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran')}
                </span>
                <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
                  tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                }`}>
                  {tx.type === 'income' ? '+' : '−'}{formatAmount(tx.amount)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Meta info */}
      {note && (
        <div className="mb-4 text-xs text-gray-400 dark:text-gray-500 space-y-0.5">
          <p>Dibuat {formatDate(note.created_at)}</p>
          <p>Terakhir diubah {formatDate(note.updated_at)}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pt-2 pb-4 border-t border-gray-100 dark:border-white/[0.06]">
        <button
          type="button"
          onClick={togglePin}
          disabled={!noteId || isPending}
          className={`btn-secondary ${isPinned ? '!border-[#1d6af5] !text-[#1d6af5]' : ''}`}
        >
          {isPinned ? '📌 Lepas Pin' : '📌 Pin'}
        </button>
        <button
          type="button"
          onClick={toggleArchive}
          disabled={!noteId || isPending}
          className="btn-secondary"
        >
          {isArchived ? 'Keluarkan dari Arsip' : 'Arsipkan'}
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={!noteId || isPending}
          className="btn-danger"
        >
          Hapus
        </button>
      </div>

      {/* Delete confirmation — soft delete (trash) */}
      <ConfirmSheet
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Pindahkan ke sampah?"
        description="Catatan masih bisa dipulihkan dari menu Sampah."
        confirmLabel="Pindahkan"
        isPending={isPending}
        danger={false}
      />
    </div>
  )
}
