'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  fetchNotesAction,
  deleteNoteAction,
  restoreNoteAction,
  permanentDeleteNoteAction,
  pinNoteAction,
  archiveNoteAction,
} from '@/lib/catatan/actions'
import type { NoteWithRefs, NoteFilter, NoteSort } from '@/lib/catatan/queries'
import ConfirmSheet from '@/components/ui/ConfirmSheet'

const FILTERS: { key: NoteFilter; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'pinned', label: 'Pinned' },
  { key: 'archived', label: 'Arsip' },
  { key: 'trash', label: 'Sampah' },
]

const SORT_OPTIONS: { key: NoteSort; label: string }[] = [
  { key: 'recently_updated', label: 'Terbaru diubah' },
  { key: 'recently_created', label: 'Terbaru dibuat' },
  { key: 'oldest', label: 'Terlama' },
]

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  hutang: { label: 'Hutang', className: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' },
  piutang: { label: 'Piutang', className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  tagihan: { label: 'Tagihan', className: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  keuangan: { label: 'Keuangan', className: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function NotesClient() {
  const [notes, setNotes] = useState<NoteWithRefs[]>([])
  const [filter, setFilter] = useState<NoteFilter>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sort, setSort] = useState<NoteSort>('recently_updated')
  const [sortOpen, setSortOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Confirm sheet state
  const [confirmAction, setConfirmAction] = useState<'delete' | 'permanent' | null>(null)
  const [confirmNote, setConfirmNote] = useState<NoteWithRefs | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Fetch notes whenever filter/search/sort changes
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setFetchError(null)

    startTransition(async () => {
      const result = await fetchNotesAction(filter, debouncedSearch || undefined, sort)
      if (cancelled) return
      if (result.error) {
        setFetchError(result.error)
        setNotes([])
      } else {
        setNotes(result.notes)
      }
      setIsLoading(false)
    })

    return () => { cancelled = true }
  }, [filter, debouncedSearch, sort])

  const runAction = (note: NoteWithRefs, action: 'delete' | 'permanent') => {
    setConfirmAction(null)
    setActionError(null)
    startTransition(async () => {
      const result = action === 'delete'
        ? await deleteNoteAction(note.id)
        : await permanentDeleteNoteAction(note.id)
      if (result && 'error' in result && result.error) {
        setActionError(result.error)
      } else {
        // Optimistic removal from current view
        setNotes(prev => prev.filter(n => n.id !== note.id))
      }
    })
  }

  const togglePin = (note: NoteWithRefs) => {
    startTransition(async () => {
      const result = await pinNoteAction(note.id, !note.is_pinned)
      if (result && 'error' in result && result.error) {
        setActionError(result.error)
        return
      }
      if (filter === 'pinned' && note.is_pinned) {
        setNotes(prev => prev.filter(n => n.id !== note.id))
      } else {
        setNotes(prev => prev.map(n => (n.id === note.id ? { ...n, is_pinned: !note.is_pinned } : n)))
      }
    })
  }

  const toggleArchive = (note: NoteWithRefs) => {
    startTransition(async () => {
      const result = await archiveNoteAction(note.id, !note.is_archived)
      if (result && 'error' in result && result.error) {
        setActionError(result.error)
        return
      }
      // Archived notes leave the active list, unarchived leave the archive list
      setNotes(prev => prev.filter(n => n.id !== note.id))
    })
  }

  const restore = (note: NoteWithRefs) => {
    startTransition(async () => {
      const result = await restoreNoteAction(note.id)
      if (result && 'error' in result && result.error) {
        setActionError(result.error)
        return
      }
      setNotes(prev => prev.filter(n => n.id !== note.id))
    })
  }

  const openConfirm = (note: NoteWithRefs, action: 'delete' | 'permanent') => {
    setConfirmNote(note)
    setConfirmAction(action)
  }

  const showEmptyState = !isLoading && !fetchError && notes.length === 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Catatan</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Ide, pengingat, dan catatan keuanganmu
          </p>
        </div>
        <Link href="/notes/baru" className="btn-primary text-sm flex-shrink-0">
          + Catatan
        </Link>
      </div>

      {/* Search + sort */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-0">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari catatan..."
            aria-label="Cari catatan"
            className="input pl-10"
          />
        </div>
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setSortOpen(v => !v)}
            className="btn-secondary !px-3"
            aria-label="Ubah urutan"
            aria-expanded={sortOpen}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 4l4-4m0 0l4 4m-4-4v8" />
            </svg>
          </button>
          {sortOpen && (
            <>
            {/* Click-away layer */}
            <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} aria-hidden="true" />
            <div
              className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden animate-scale-in z-20"
              role="menu"
            >
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => { setSort(opt.key); setSortOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    sort === opt.key
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  role="menuitem"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            </>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
              filter === f.key
                ? 'bg-[#1d6af5] text-white shadow-sm'
                : 'bg-gray-100 dark:bg-white/[0.07] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.12]'
            }`}
            aria-pressed={filter === f.key}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {fetchError && (
        <div className="py-12 text-center border border-dashed border-red-200 dark:border-red-500/30 rounded-2xl mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Gagal memuat catatan</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{fetchError}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-2.5" aria-hidden="true">
          {[0, 1, 2].map(i => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {showEmptyState && (
        <div className="py-14 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          <svg
            className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3"
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {filter === 'trash' ? 'Sampah kosong' : filter === 'archived' ? 'Belum ada arsip' : 'Belum ada catatan'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4">
            {filter === 'all' ? 'Catat ide, pengingat, atau hal pentingmu di sini.' : 'Catatan yang sesuai akan muncul di sini.'}
          </p>
          {filter === 'all' && (
            <Link href="/notes/baru" className="btn-primary text-sm">+ Buat catatan</Link>
          )}
        </div>
      )}

      {/* Notes list */}
      {!isLoading && notes.length > 0 && (
        <div className="space-y-2.5">
          {notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              filter={filter}
              isPending={isPending}
              onTogglePin={() => togglePin(note)}
              onToggleArchive={() => toggleArchive(note)}
              onDelete={() => openConfirm(note, 'delete')}
              onRestore={() => restore(note)}
              onPermanentDelete={() => openConfirm(note, 'permanent')}
            />
          ))}
        </div>
      )}

      {actionError && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{actionError}</p>
      )}

      {/* Delete confirmation */}
      <ConfirmSheet
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmNote && confirmAction && runAction(confirmNote, confirmAction)}
        title={confirmAction === 'permanent' ? 'Hapus catatan secara permanen?' : 'Pindahkan ke sampah?'}
        description={
          confirmAction === 'permanent'
            ? 'Catatan ini tidak dapat dipulihkan.'
            : 'Catatan masih bisa dipulihkan dari menu Sampah.'
        }
        confirmLabel={confirmAction === 'permanent' ? 'Hapus Permanen' : 'Pindahkan'}
        isPending={isPending}
        danger={confirmAction === 'permanent'}
      />
    </div>
  )
}

// ─── Note card ────────────────────────────────────────────────────────────────

interface NoteCardProps {
  note: NoteWithRefs
  filter: NoteFilter
  isPending: boolean
  onTogglePin: () => void
  onToggleArchive: () => void
  onDelete: () => void
  onRestore: () => void
  onPermanentDelete: () => void
}

function NoteCard({
  note, filter, isPending,
  onTogglePin, onToggleArchive, onDelete, onRestore, onPermanentDelete,
}: NoteCardProps) {
  const done = note.checklist.filter(c => c.is_completed).length
  const total = note.checklist.length
  const badge = TYPE_BADGES[note.note_type]

  const truncate = (s: string, max: number) => (s.length > max ? s.slice(0, max) + '…' : s)

  return (
    <div
      className={`card p-4 transition-opacity ${isPending ? 'opacity-60' : ''} ${
        note.deleted_at ? 'opacity-75' : ''
      }`}
    >
      <Link href={`/notes/${note.id}/edit`} className="block group">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {note.is_pinned && (
                <svg className="w-3.5 h-3.5 text-[#1d6af5] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-label="Dipin">
                  <path d="M16 3v2l-1 1v5l3 2v2h-6v6l-1 1-1-1v-6H4v-2l3-2V6L6 5V3h10z" />
                </svg>
              )}
              <p className={`text-sm font-semibold text-gray-900 dark:text-white truncate ${!note.title ? 'italic text-gray-400 dark:text-gray-500' : ''}`}>
                {note.title || truncate(note.content ?? 'Tanpa judul', 60) || 'Tanpa judul'}
              </p>
            </div>
            {note.content && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {truncate(note.content, 140)}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {badge && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                  {badge.label}
                </span>
              )}
              {note.amount != null && (
                <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 tabular-nums">
                  {formatAmount(note.amount)}
                </span>
              )}
              {note.due_date && (
                <span className={`text-[11px] tabular-nums ${
                  new Date(note.due_date) < new Date() && note.financial_status === 'pending'
                    ? 'text-red-500 font-semibold'
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  Jatuh tempo {formatDate(note.due_date)}
                </span>
              )}
              {total > 0 && (
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  ☑ {done}/{total}
                </span>
              )}
            </div>
            {note.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {note.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.07] text-gray-600 dark:text-gray-300"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Meta + actions row */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-gray-100 dark:border-white/[0.06]">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 flex-1 min-w-0 truncate">
          {note.deleted_at ? `Dihapus ${formatDate(note.deleted_at)}` : `Diubah ${formatDate(note.updated_at)}`}
        </p>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          {filter === 'trash' ? (
            <>
              <button
                type="button"
                onClick={onRestore}
                disabled={isPending}
                className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                aria-label="Pulihkan catatan"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v1m0 0l-3-3m3 3l3-3M3 14v3a2 2 0 002 2h4" />
                </svg>
              </button>
              <button
                type="button"
                onClick={onPermanentDelete}
                disabled={isPending}
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                aria-label="Hapus permanen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onTogglePin}
                disabled={isPending}
                className={`p-2 rounded-lg transition-colors ${
                  note.is_pinned
                    ? 'text-[#1d6af5] hover:bg-[#1d6af5]/10'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                aria-label={note.is_pinned ? 'Lepas pin' : 'Pin catatan'}
              >
                <svg className="w-4 h-4" fill={note.is_pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 3v2l-1 1v5l3 2v2h-6v6l-1 1-1-1v-6H4v-2l3-2V6L6 5V3h10z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={onToggleArchive}
                disabled={isPending}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={note.is_archived ? 'Keluarkan dari arsip' : 'Arsipkan catatan'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={isPending}
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                aria-label="Pindahkan ke sampah"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
