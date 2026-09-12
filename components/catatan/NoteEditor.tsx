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
  type: 'income' | 'expense'
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

  // ── UI state ─────────────────────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDetails, setShowDetails] = useState(note ? note.note_type !== 'general' : false)
  const [showTxPicker, setShowTxPicker] = useState(false)

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
  const typeLabel = NOTE_TYPE_OPTIONS.find(o => o.value === noteType)?.label ?? 'Umum'

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
      {/* Header: back, save status, actions menu */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <BackButton href="/notes" />
          {saveIndicator}
        </div>

        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
            aria-label="Opsi catatan"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="12" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="19" cy="12" r="1.8" />
            </svg>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} aria-hidden="true" />
              <div
                className="absolute right-0 top-11 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden animate-scale-in z-30"
                role="menu"
              >
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); togglePin() }}
                  disabled={!noteId || isPending}
                  className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  role="menuitem"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 3v2l-1 1v5l3 2v2h-6v6l-1 1-1-1v-6H4v-2l3-2V6L6 5V3h10z" />
                  </svg>
                  {isPinned ? 'Lepas pin' : 'Pin'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); toggleArchive() }}
                  disabled={!noteId || isPending}
                  className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  role="menuitem"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  {isArchived ? 'Keluarkan dari arsip' : 'Arsipkan'}
                </button>
                <div className="h-px bg-gray-100 dark:bg-white/[0.06]" role="separator" />
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setShowDeleteConfirm(true) }}
                  disabled={!noteId || isPending}
                  className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  role="menuitem"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Pindahkan ke sampah
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {saveError && (
        <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm" role="alert">
          {saveError}
        </div>
      )}

      {/* Writing surface — like a real notes app, no visible form chrome */}
      <div className="card p-4 sm:p-5 mb-4">
        <input
          id="note-title"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-lg font-semibold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:ring-0 p-0"
          placeholder="Judul catatan"
          aria-label="Judul catatan"
          maxLength={200}
        />
        <textarea
          id="note-content"
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:ring-0 p-0 mt-2 resize-y min-h-40 leading-relaxed"
          placeholder="Tulis catatanmu di sini..."
          aria-label="Isi catatan"
          rows={6}
          maxLength={20000}
        />
      </div>

      {/* Collapsible detail section */}
      <div className="card mb-4 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDetails(v => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
          aria-expanded={showDetails}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Detail</span>
            {noteType !== 'general' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1d6af5]/10 text-[#1d6af5]">
                {typeLabel}
              </span>
            )}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showDetails ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDetails && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-white/[0.06] pt-4">
            {/* Note type */}
            <div>
              <label htmlFor="note-type" className="label">Tipe Catatan</label>
              <CustomSelect
                id="note-type"
                name="note_type"
                value={noteType}
                onChange={v => setNoteType(v as NoteType)}
                options={NOTE_TYPE_OPTIONS}
              />
            </div>

            {/* Financial fields — only for financial note types */}
            {isFinancial && (
              <div className="space-y-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.07] rounded-2xl p-4">
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

            {/* Tags */}
            <div>
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

            {/* Linked transactions — collapsible inside details */}
            {recentTransactions.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowTxPicker(v => !v)}
                  className="w-full flex items-center justify-between gap-3 py-1 text-left"
                  aria-expanded={showTxPicker}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="label !mb-0">Transaksi Terhubung</span>
                    {linkedTx.length > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                        {linkedTx.length}
                      </span>
                    )}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showTxPicker ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showTxPicker && (
                  <>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-2">
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
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

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
          <ul className="card divide-y divide-gray-100 dark:border-white/[0.07] dark:divide-white/[0.05] mb-2">
            {checklist.map((item, index) => (
              <li key={item.id} className="flex items-center gap-2 px-3 py-2.5 group">
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
                    className="input !py-1 flex-1 min-w-0 text-sm"
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

                <div className="flex items-center flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 sm:opacity-60 sm:group-hover:opacity-100">
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

      {/* Meta info */}
      {note && (
        <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
          Dibuat {formatDate(note.created_at)} · Diubah {formatDate(note.updated_at)}
        </p>
      )}

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
