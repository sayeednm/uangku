'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/ui/BackButton'
import CustomSelect from '@/components/ui/CustomSelect'
import { formatCurrency } from '@/lib/utils/currency'
import { quickSaveTransactionAction } from '@/lib/transaksi/actions'

interface SuaraClientProps {
  accounts: { id: string; name: string; type: string }[]
  incomeCategories: { id: string; name: string; icon: string | null }[]
  expenseCategories: { id: string; name: string; icon: string | null }[]
}

interface ParseResult {
  type: 'income' | 'expense'
  amount: number
  description: string
  category: string
  confidence: number
}

interface SavedRecord {
  type: 'income' | 'expense'
  amount: number
  description: string
  category: string
  accountName: string
}

type Stage = 'idle' | 'listening' | 'processing' | 'saving' | 'review'

// Minimal typings for the Web Speech API (not in all TS DOM libs)
interface SpeechRecognitionAlternative {
  transcript: string
}
interface SpeechRecognitionResult {
  isFinal: boolean
  0: SpeechRecognitionAlternative
}
interface SpeechRecognitionEventLike {
  results: { length: number; [i: number]: SpeechRecognitionResult }
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Izin mikrofon ditolak. Izinkan akses mikrofon di pengaturan browser lalu coba lagi.',
  'service-not-allowed': 'Izin mikrofon ditolak. Izinkan akses mikrofon di pengaturan browser lalu coba lagi.',
  'no-speech': 'Tidak ada suara terdeteksi. Bicara lebih dekat ke mikrofon lalu coba lagi.',
  'audio-capture': 'Mikrofon tidak tersedia di perangkat ini. Coba ketik manual di bawah.',
  network: 'Koneksi bermasalah. Periksa internet lalu coba lagi.',
  aborted: 'Dibatalkan.',
}

const EXAMPLES = [
  { text: 'beli jajan 20 ribu', label: 'Jajan 20rb' },
  { text: 'kena kopi 35 ribu', label: 'Kopi 35rb' },
  { text: 'isi bensin 25 k', label: 'Bensin 25k' },
  { text: 'dapat gaji 3 juta', label: 'Gaji 3jt' },
]

const AUTOSAVE_KEY = 'suara-autosave'

const todayISO = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function SuaraClient({ accounts, incomeCategories, expenseCategories }: SuaraClientProps) {
  const router = useRouter()

  const [speechSupported, setSpeechSupported] = useState(true)
  const [stage, setStage] = useState<Stage>('idle')
  const [transcript, setTranscript] = useState('')
  const [voiceError, setVoiceError] = useState<string | null>(null)

  // Auto-save mode (persisted): parsed result is saved directly, no editing
  const [autoSave, setAutoSave] = useState(false)
  const [lastSaved, setLastSaved] = useState<SavedRecord | null>(null)

  // Manual fallback input
  const [manualText, setManualText] = useState('')

  // Review state (used when auto-save is off or a save fails)
  const [result, setResult] = useState<ParseResult | null>(null)
  const [txType, setTxType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const listeningRef = useRef(false)

  // Validate support + restore auto-save setting once on mount
  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    setSpeechSupported(!!(w.SpeechRecognition ?? w.webkitSpeechRecognition))
    setAutoSave(localStorage.getItem(AUTOSAVE_KEY) === '1')
  }, [])

  const toggleAutoSave = () => {
    setAutoSave(prev => {
      const next = !prev
      try {
        localStorage.setItem(AUTOSAVE_KEY, next ? '1' : '0')
      } catch { /* storage unavailable — setting lasts for the session */ }
      return next
    })
    setVoiceError(null)
  }

  const categories = txType === 'income' ? incomeCategories : expenseCategories

  // ── Auto-save directly from the parse result (no editing) ──────────────────

  const autoSaveParsed = useCallback(async (parsed: ParseResult) => {
    const list = parsed.type === 'income' ? incomeCategories : expenseCategories
    const catMatch = list.find(
      c => c.name.trim().toLowerCase() === String(parsed.category ?? '').trim().toLowerCase()
    )
    const fallbackCat = list.find(c => c.name.trim().toLowerCase() === 'lainnya') ?? list[0]
    const acct = accounts[0]

    if (accounts.length === 0 || !fallbackCat) {
      // Cannot build a valid record silently — fall back to the review form
      setVoiceError('Rekening atau kategori belum tersedia. Atur dulu, lalu ucapkan lagi.')
      setStage('idle')
      return
    }

    setStage('saving')
    const { error } = await quickSaveTransactionAction({
      type: parsed.type,
      amount: parsed.amount,
      account_id: acct.id,
      category_id: catMatch?.id ?? fallbackCat.id,
      transaction_date: todayISO(),
      description: parsed.description || undefined,
    })

    if (error) {
      // Save refused — drop into the review form prefilled so nothing is lost
      setResult(parsed)
      setTxType(parsed.type)
      setAmount(String(parsed.amount))
      setDescription(parsed.description ?? '')
      setDate(todayISO())
      setCategoryId(catMatch?.id ?? fallbackCat.id)
      setSaveError(error)
      setStage('review')
      return
    }

    setLastSaved({
      type: parsed.type,
      amount: parsed.amount,
      description: parsed.description,
      category: catMatch?.name ?? fallbackCat.name,
      accountName: acct.name,
    })
    setTranscript('')
    setStage('idle')
  }, [accounts, incomeCategories, expenseCategories])

  // ── Parse pipeline ─────────────────────────────────────────────────────────

  const runParse = useCallback(async (rawText: string) => {
    const text = rawText.trim()
    if (!text) {
      setVoiceError('Kalimat masih kosong. Ucapkan atau ketik dulu, misal: "beli jajan 20 ribu".')
      setStage('idle')
      return
    }

    setTranscript(text)
    setVoiceError(null)
    setLastSaved(null)
    setStage('processing')

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30_000)
      let res: Response
      try {
        res = await fetch('/api/parse-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timer)
      }
      const data = await res.json()

      if (!res.ok || data.error) {
        setVoiceError(data.error ?? 'Gagal membaca kalimat')
        setStage('idle')
        return
      }

      const parsed: ParseResult = data

      if (autoSave) {
        await autoSaveParsed(parsed)
        return
      }

      const list = parsed.type === 'income' ? incomeCategories : expenseCategories
      const catMatch = list.find(
        c => c.name.trim().toLowerCase() === String(parsed.category ?? '').trim().toLowerCase()
      )

      setResult(parsed)
      setTxType(parsed.type)
      setAmount(parsed.amount > 0 ? String(parsed.amount) : '')
      setDescription(parsed.description ?? '')
      setDate(todayISO())
      setCategoryId(catMatch?.id ?? list[0]?.id ?? '')
      setStage('review')
    } catch (err) {
      setVoiceError(
        err instanceof DOMException && err.name === 'AbortError'
          ? 'Waktu tunggu habis. Periksa koneksi internet lalu coba lagi.'
          : 'Terjadi kesalahan. Coba lagi.'
      )
      setStage('idle')
    }
  }, [autoSave, autoSaveParsed, incomeCategories, expenseCategories])

  // ── Speech recognition ─────────────────────────────────────────────────────

  const stopListening = useCallback(() => {
    listeningRef.current = false
    try {
      recognitionRef.current?.stop()
    } catch {
      // already stopped
    }
    recognitionRef.current = null
  }, [])

  const startListening = useCallback(() => {
    if (stage === 'listening' || stage === 'processing' || stage === 'saving') return

    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition

    stopListening()
    setVoiceError(null)
    setLastSaved(null)
    setTranscript('')
    setStage('listening')

    const recognition = new Ctor!()
    recognitionRef.current = recognition
    listeningRef.current = true
    recognition.lang = 'id-ID'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let finalText = ''
      let interimText = ''
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interimText += r[0].transcript
      }
      setTranscript((finalText || interimText).trim())
      if (finalText.trim()) {
        stopListening()
        setStage('processing')
        runParse(finalText)
      }
    }

    recognition.onerror = (event: { error: string }) => {
      const msg = ERROR_MESSAGES[event.error] ?? 'Terjadi kesalahan. Coba lagi.'
      setVoiceError(msg)
      setStage('idle')
    }

    recognition.onend = () => {
      if (listeningRef.current) {
        listeningRef.current = false
        setStage('idle')
      }
    }

    try {
      recognition.start()
    } catch {
      setVoiceError('Tidak bisa memulai mikrofon. Coba lagi.')
      setStage('idle')
    }
  }, [runParse, stage, stopListening])

  // Cleanup on unmount
  useEffect(() => () => stopListening(), [stopListening])

  // ── Review actions ─────────────────────────────────────────────────────────

  const reListen = () => {
    setResult(null)
    setSaveError(null)
    setTranscript('')
    setStage('idle')
  }

  // Keep category valid when the type toggle changes in review
  const switchType = (t: 'income' | 'expense') => {
    setTxType(t)
    const list = t === 'income' ? incomeCategories : expenseCategories
    setCategoryId(prev => (list.some(c => c.id === prev) ? prev : list[0]?.id ?? ''))
  }

  const save = async () => {
    const amountNum = parseInt(amount.replace(/\D/g, ''), 10) || 0
    if (amountNum <= 0) { setSaveError('Nominal harus lebih dari 0'); return }
    if (!accountId) { setSaveError('Rekening wajib dipilih'); return }
    if (!categoryId) { setSaveError('Kategori wajib dipilih'); return }

    setSaving(true)
    setSaveError(null)
    const { error } = await quickSaveTransactionAction({
      type: txType,
      amount: amountNum,
      account_id: accountId,
      category_id: categoryId,
      transaction_date: date || todayISO(),
      description: description || undefined,
    })

    if (error) {
      setSaveError(error)
      setSaving(false)
      return
    }
    const label = txType === 'income' ? 'Pemasukan' : 'Pengeluaran'
    router.push(`/transaksi?success=${label}+berhasil+dicatat`)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const listening = stage === 'listening'
  const busy = stage === 'processing' || stage === 'saving'
  const autoSaveIsOn = autoSave && speechSupported

  return (
    <div
      className={`min-h-screen
      ${stage === 'review' ? 'bg-[#F0F4FF] dark:bg-[#0A0C14]' : 'bg-[#0A0C14] text-white'}`}
    >
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 h-14 backdrop-blur-xl border-b bg-[#0A0C14]/95 border-white/[0.06]">
        <BackButton label="" />
        <h1 className="text-base font-bold tracking-tight flex-1">Catat Suara</h1>
        {/* Auto-save switch */}
        <button
          type="button"
          onClick={toggleAutoSave}
          role="switch"
          aria-checked={autoSaveIsOn}
          aria-label="Simpan otomatis tanpa edit"
          className="flex items-center gap-2 active:scale-95 transition-transform"
        >
          <span className="hidden sm:block text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: autoSaveIsOn ? '#10b981' : 'rgba(255,255,255,0.4)' }}>
            Auto
          </span>
          <span
            className="relative w-10 h-6 rounded-full transition-colors duration-200"
            style={{ backgroundColor: autoSaveIsOn ? '#10b981' : 'rgba(255,255,255,0.12)' }}
          >
            <span
              className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200"
              style={{ transform: autoSaveIsOn ? 'translateX(16px)' : 'translateX(0)' }}
            />
          </span>
        </button>
      </header>

      {/* Auto-save explainer (only when enabled) */}
      {autoSaveIsOn && stage !== 'review' && (
        <div className="max-w-lg mx-auto px-4">
          <div className="mt-3 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="text-xs text-emerald-300/90 leading-relaxed">
              <span className="font-semibold">Mode otomatis aktif</span> — cukup bicara, langsung tercatat. Tidak perlu isi form.
            </p>
          </div>
        </div>
      )}

      {/* ── Capture stage ── */}
      {stage !== 'review' && (
        <main className="max-w-lg mx-auto px-4 pb-44 pt-6">

          {/* Success after auto-save */}
          {lastSaved && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 px-4 py-4 animate-scale-in mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-emerald-400">Tercatat otomatis</p>
                  <p className="text-xs text-white/70 mt-0.5 truncate">
                    Rp{formatCurrency(lastSaved.amount)} · {lastSaved.description || lastSaved.category} · {lastSaved.category} · {lastSaved.accountName}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-white/40 mt-2">Bicara lagi tanpa berhenti — tap mic saat siap.</p>
            </div>
          )}

          {/* State card — single precise indicator for listening / processing / idle */}
          <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] px-6 py-8">
            {listening && (
              <div className="flex flex-col items-center animate-fade-in">
                {/* Equalizer — active recording */}
                <div className="flex items-center gap-1.5 h-10" aria-hidden="true">
                  {[0.9, 0.4, 1.3, 0.7, 1.6, 0.6, 1.2, 0.8, 0.5].map((d, i) => (
                    <span
                      key={i}
                      className="w-1.5 rounded-full h-10"
                      style={{
                        background: 'linear-gradient(180deg, #fca5a5, #ef4444)',
                        transformOrigin: 'center',
                        animation: `voiceBar 0.9s ease-in-out ${d}s infinite`,
                      }}
                    />
                  ))}
                </div>
                <p className="mt-4 text-sm font-semibold">Mendengarkan…</p>
                <p className="mt-1 text-xs text-white/45 min-h-[2.5rem] px-2 text-center">
                  {transcript || 'Bilang aja, misal "beli jajan 20 ribu"'}
                </p>
              </div>
            )}

            {busy && (
              <div className="flex flex-col items-center animate-fade-in">
                {/* Processing — three clean pulse bars, brand blue */}
                <div className="flex items-center justify-center gap-2 h-10" aria-hidden="true">
                  {[0, 0.22, 0.44].map((d, i) => (
                    <span
                      key={i}
                      className="w-2 h-8 rounded-full bg-[#1d6af5]"
                      style={{ animation: `voicePulse 1.1s ease-in-out ${d}s infinite` }}
                    />
                  ))}
                </div>
                <p className="mt-4 text-sm font-semibold">
                  {stage === 'saving' ? 'Menyimpan…' : 'Menganalisis dengan AI…'}
                </p>
                <p className="mt-1 text-xs text-white/45 truncate max-w-full">
                  &ldquo;{transcript}&rdquo;
                </p>
              </div>
            )}

            {stage === 'idle' && !lastSaved && (
              <div className="flex flex-col items-center animate-fade-in">
                <div className="w-14 h-14 rounded-full bg-[#1d6af5]/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-[#60a5fa]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <p className="mt-4 text-sm font-semibold">
                  {speechSupported ? 'Tap tombol mic, lalu bicara' : 'Mikrofon tidak didukung browser ini'}
                </p>
                <p className="mt-1 text-xs text-white/45 text-center">
                  {speechSupported ? 'Bisa secepat lisanmu bergerak' : 'Tetap bisa kok, ketik manual di bawah'}
                </p>
              </div>
            )}

            {stage === 'idle' && lastSaved && !listening && !busy && (
              <div className="flex flex-col items-center animate-fade-in">
                <p className="text-sm text-white/50">Mic siap untuk transaksi berikutnya</p>
                <p className="mt-1 text-xs text-white/35">atau ketik manual di bawah</p>
              </div>
            )}
          </div>

          {voiceError && (
            <div className="mt-4 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 flex gap-2.5 animate-scale-in">
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-400">{voiceError}</p>
            </div>
          )}

          {/* Idle extras: example chips + manual input */}
          {(stage === 'idle' || listening) && (
            <div className={`${listening ? 'mt-8' : 'mt-8'} stagger`}>
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2.5 text-center">
                Contoh kalimat
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map(ex => (
                  <button
                    key={ex.text}
                    type="button"
                    onClick={() => { if (!busy) { setManualText(ex.text); runParse(ex.text) } }}
                    disabled={busy}
                    className="px-3.5 py-2 rounded-full text-xs font-medium bg-white/[0.06] text-white/80
                      border border-white/[0.08] hover:bg-white/[0.12] active:scale-95 transition-all disabled:opacity-40"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4">
                <label htmlFor="suara-manual" className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                  Atau ketik manual
                </label>
                <div className="flex gap-2">
                  <input
                    id="suara-manual"
                    type="text"
                    value={manualText}
                    onChange={e => setManualText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && manualText.trim() && !busy) runParse(manualText) }}
                    placeholder="beli jajan 20 ribu"
                    className="input flex-1 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => runParse(manualText)}
                    disabled={!manualText.trim() || busy}
                    className="btn-primary px-5 disabled:opacity-40"
                  >
                    Analisis
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ── Floating mic FAB — thumb zone, bottom right ── */}
      {stage !== 'review' && (
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          disabled={busy || !speechSupported}
          aria-label={listening ? 'Berhenti mendengarkan' : 'Mulai bicara'}
          className="fixed z-40 w-[72px] h-[72px] rounded-full flex items-center justify-center text-white
            transition-all duration-200 active:scale-90 disabled:opacity-40"
          style={{
            // Horizontally centered via margin instead of transform — an inline
            // transform would clobber Tailwind's active:scale-90 animation
            left: '50%',
            marginLeft: '-36px', // half of the 72px button
            bottom: 'calc(max(1.5rem, env(safe-area-inset-bottom)) + 0.5rem)',
            backgroundColor: listening ? '#ef4444' : '#1d6af5',
            boxShadow: listening
              ? '0 10px 30px rgba(239,68,68,0.5), 0 0 0 8px rgba(239,68,68,0.15)'
              : '0 10px 30px rgba(29,106,245,0.5), 0 0 0 8px rgba(29,106,245,0.15)',
          }}
        >
          {listening ? (
            <span className="w-6 h-6 rounded-md bg-white" aria-hidden="true" />
          ) : (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
      )}

      {/* ── Review stage (shown when auto-save is off or save failed) ── */}
      {stage === 'review' && result && (
        <main className="max-w-lg mx-auto px-4 pb-32 pt-4 animate-fade-up">
          {/* Confidence banner */}
          {(() => {
            const confidence = Number(result.confidence) || 0
            const label = confidence >= 0.75 ? 'Akurat' : confidence >= 0.4 ? 'Periksa kembali' : 'Kurang yakin'
            const color = confidence >= 0.75 ? '#10b981' : confidence >= 0.4 ? '#f59e0b' : '#ef4444'
            return (
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <p className="text-xs font-semibold" style={{ color }}>{label}</p>
                <p className="text-xs text-gray-400 dark:text-white/40">— periksa detail sebelum menyimpan</p>
              </div>
            )
          })()}

          {/* Original speech */}
          <div className="flex items-start gap-2 mb-4 text-gray-500 dark:text-white/40">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            <p className="text-sm italic line-clamp-2">&ldquo;{transcript}&rdquo;</p>
          </div>

          {/* Income / expense toggle */}
          <div className="grid grid-cols-2 gap-2 bg-white dark:bg-white/[0.05] border border-gray-200/60 dark:border-white/[0.08] rounded-2xl p-1.5 mb-3">
            <button
              type="button"
              onClick={() => switchType('expense')}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97]
                ${txType === 'expense'
                  ? 'bg-red-500 text-white shadow-[0_2px_8px_rgba(239,68,68,0.4)]'
                  : 'text-gray-500 dark:text-white/50'}`}
              aria-pressed={txType === 'expense'}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => switchType('income')}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97]
                ${txType === 'income'
                  ? 'bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.4)]'
                  : 'text-gray-500 dark:text-white/50'}`}
              aria-pressed={txType === 'income'}
            >
              Pemasukan
            </button>
          </div>

          {/* Amount */}
          <div className={`bg-white dark:bg-white/[0.05] border rounded-2xl p-4 transition-colors
            ${txType === 'income' ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
            <label className="block text-[11px] font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-2">
              {txType === 'income' ? 'Uang Masuk' : 'Uang Keluar'}
            </label>
            <div className="flex items-baseline gap-2">
              <span className={`text-lg font-medium ${txType === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount ? formatCurrency(parseInt(amount, 10)) : ''}
                onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
                className="flex-1 min-w-0 bg-transparent text-3xl font-bold tracking-tight outline-none text-gray-900 dark:text-white"
                placeholder="0"
                autoFocus
              />
            </div>
          </div>

          {/* Details */}
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-2">
                Kategori
              </label>
              <CustomSelect
                id="suara-category"
                name="suara-category"
                value={categoryId}
                onChange={setCategoryId}
                placeholder="Pilih kategori"
                options={categories.map(c => ({ value: c.id, label: c.name, icon: c.icon }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-2">
                Rekening
              </label>
              <CustomSelect
                id="suara-account"
                name="suara-account"
                value={accountId}
                onChange={setAccountId}
                placeholder="Pilih rekening"
                options={accounts.map(a => ({ value: a.id, label: a.name }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="suara-date" className="block text-[11px] font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-2">
                  Tanggal
                </label>
                <input
                  id="suara-date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="input [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              <div>
                <label htmlFor="suara-desc" className="block text-[11px] font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-2">
                  Keterangan
                </label>
                <input
                  id="suara-desc"
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="input"
                  maxLength={200}
                  placeholder="Contoh: Jajan"
                />
              </div>
            </div>
          </div>

          {saveError && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{saveError}</p>
          )}

          {/* Actions */}
          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={`w-full disabled:opacity-50 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm
                text-white active:scale-[0.97] disabled:active:scale-100 transition-all duration-200
                shadow-[0_4px_16px_rgba(0,0,0,0.15)]`}
              style={{ backgroundColor: txType === 'income' ? '#10b981' : '#1d6af5' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {saving ? 'Menyimpan…' : txType === 'income' ? 'Simpan Pemasukan' : 'Simpan Pengeluaran'}
            </button>
            <button
              type="button"
              onClick={reListen}
              className="btn-secondary w-full"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Ucapkan Ulang
            </button>
          </div>
        </main>
      )}

      <style>{`
        @keyframes voiceBar {
          0%, 100% { transform: scaleY(0.25); }
          50%      { transform: scaleY(1); }
        }
        @keyframes voicePulse {
          0%, 100% { transform: scaleY(0.35); opacity: 0.55; }
          50%      { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
