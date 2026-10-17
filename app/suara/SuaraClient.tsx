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

type Stage = 'idle' | 'listening' | 'processing' | 'review'

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

  // Manual fallback input
  const [manualText, setManualText] = useState('')

  // Review state
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

  // Validate support once on mount
  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    setSpeechSupported(!!(w.SpeechRecognition ?? w.webkitSpeechRecognition))
  }, [])

  const categories = txType === 'income' ? incomeCategories : expenseCategories

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
    setStage('processing')

    try {
      // Abort gracefully if the network/AI call stalls (flaky mobile data)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 45_000)
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
  }, [incomeCategories, expenseCategories])

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
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition

    stopListening()
    setVoiceError(null)
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
      // No final result arrived (e.g. no-speech) only if runParse never fired
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
  }, [runParse, stopListening])

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
  const processing = stage === 'processing'
  const isIncome = txType === 'income'

  return (
    <div className={`min-h-screen text-gray-900 dark:text-white
      ${stage === 'review' ? 'bg-[#F0F4FF] dark:bg-[#0A0C14]' : 'bg-[#0A0C14] text-white'}`}>
      {/* Top bar */}
      <header className={`sticky top-0 z-20 flex items-center gap-3 px-4 h-14 backdrop-blur-xl border-b
        ${stage === 'review'
          ? 'bg-white/95 dark:bg-[#0A0C14]/95 border-gray-200/50 dark:border-white/[0.06]'
          : 'bg-[#0A0C14]/95 border-white/[0.06]'}`}>
        <BackButton label="" />
        <h1 className="text-base font-bold tracking-tight">Catat Suara</h1>
      </header>

      {/* ── Capture stage ── */}
      {stage !== 'review' && (
        <main className="max-w-lg mx-auto px-4 pb-16">
          {/* Mic hero */}
          <div className="pt-8 flex flex-col items-center">
            {!processing && (
              <>
                <div className="relative flex items-center justify-center">
                  {/* Pulse rings (only while listening) */}
                  {listening && (
                    <>
                      <span className="absolute w-28 h-28 rounded-full pointer-events-none" style={{ backgroundColor: 'rgba(239,68,68,0.18)', animation: 'voiceHalo 1.8s ease-out infinite' }} />
                      <span className="absolute w-28 h-28 rounded-full pointer-events-none" style={{ backgroundColor: 'rgba(239,68,68,0.12)', animation: 'voiceHalo 1.8s ease-out 0.6s infinite' }} />
                      <span className="absolute w-28 h-28 rounded-full pointer-events-none" style={{ backgroundColor: 'rgba(239,68,68,0.08)', animation: 'voiceHalo 1.8s ease-out 1.2s infinite' }} />
                    </>
                  )}

                  <button
                    type="button"
                    onClick={listening ? stopListening : startListening}
                    disabled={processing || !speechSupported}
                    aria-label={listening ? 'Berhenti mendengarkan' : 'Mulai bicara'}
                    className="relative w-28 h-28 rounded-full flex items-center justify-center text-white
                      transition-all duration-200 active:scale-90 disabled:opacity-40 animate-spring"
                    style={{
                      backgroundColor: listening ? '#ef4444' : '#1d6af5',
                      boxShadow: listening
                        ? '0 10px 32px rgba(239,68,68,0.45)'
                        : '0 10px 32px rgba(29,106,245,0.45)',
                    }}
                  >
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                </div>

                {/* Equalizer bars while listening */}
                {listening ? (
                  <div className="mt-6 flex items-end gap-1 h-6" aria-hidden="true">
                    {[0.9, 0.5, 1.3, 0.7, 1.6, 0.6, 1.1, 0.8, 0.5].map((d, i) => (
                      <span
                        key={i}
                        className="w-1 rounded-full"
                        style={{
                          background: 'linear-gradient(180deg, #f87171, #ef4444)',
                          height: '100%',
                          transformOrigin: 'bottom',
                          animation: `voiceBar 0.9s ease-in-out ${d}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 h-6" />
                )}

                <p className="text-[15px] font-semibold animate-fade-in">
                  {listening ? 'Aku mendengarkan...' : speechSupported ? 'Tap, lalu ucapkan transaksinya' : 'Mikrofon tidak didukung browser ini'}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {listening
                    ? 'Bilang aja, misal: "beli jajan 20 ribu"'
                    : speechSupported
                      ? 'Contoh: "beli jajan 20 ribu" atau "dapat gaji 3 juta"'
                      : 'Tetap bisa kok, ketik manual di bawah'}
                </p>
              </>
            )}

            {/* Processing state */}
            {processing && (
              <div className="pt-8 flex flex-col items-center animate-fade-in">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full" style={{ animation: 'voiceSpin 1.1s linear infinite', border: '3px solid rgba(29,106,245,0.2)', borderTopColor: '#1d6af5' }} />
                  <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(29,106,245,0.12)' }}>
                    <svg className="w-9 h-9 text-[#60a5fa]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                </div>
                <p className="mt-6 text-[15px] font-semibold">
                  Menganalisis
                  <span aria-hidden="true">
                    <span style={{ animation: 'voiceDots 1.4s infinite steps(1)' }}>.{"\u200B"}</span>
                    <span style={{ animation: 'voiceDots 1.4s infinite 0.35s steps(1)' }}>.{"\u200B"}</span>
                    <span style={{ animation: 'voiceDots 1.4s infinite 0.7s steps(1)' }}>.{"\u200B"}</span>
                  </span>
                </p>
                <p className="mt-1 text-xs text-white/50 max-w-xs text-center truncate">
                  &ldquo;{transcript}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Live transcript */}
          {listening && (
            <div className="mt-6 px-5 py-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] animate-fade-in">
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1">Aku dengar</p>
              <p className="text-sm text-white/85 min-h-[1.5rem]">{transcript || '\u00A0'}</p>
            </div>
          )}

          {voiceError && (
            <div className="mt-4 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 flex gap-2.5 animate-scale-in">
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-400">{voiceError}</p>
            </div>
          )}

          {/* Idle extras: example chips + manual input */}
          {stage === 'idle' && (
            <div className="mt-8 stagger">
              {/* Example chips */}
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2.5 text-center">
                Coba ucapkan salah satu ini
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map(ex => (
                  <button
                    key={ex.text}
                    type="button"
                    onClick={() => { setManualText(ex.text); runParse(ex.text) }}
                    className="px-3.5 py-2 rounded-full text-xs font-medium bg-white/[0.06] text-white/80
                      border border-white/[0.08] hover:bg-white/[0.12] active:scale-95 transition-all"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>

              {/* Manual input */}
              <div className="mt-6 rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4">
                <label htmlFor="suara-manual" className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                  Atau ketik manual
                </label>
                <div className="flex gap-2">
                  <input
                    id="suara-manual"
                    type="text"
                    value={manualText}
                    onChange={e => setManualText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && manualText.trim()) runParse(manualText) }}
                    placeholder="beli jajan 20 ribu"
                    className="input flex-1 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => runParse(manualText)}
                    disabled={!manualText.trim()}
                    className="btn-primary px-5 disabled:opacity-40"
                  >
                    Analisis
                  </button>
                </div>
              </div>
            </div>
          )}

          <style>{`
            @keyframes voiceHalo {
              0%   { transform: scale(1); opacity: 0.8; }
              100% { transform: scale(2.1); opacity: 0; }
            }
            @keyframes voiceBar {
              0%, 100% { transform: scaleY(0.25); }
              50%      { transform: scaleY(1); }
            }
            @keyframes voiceSpin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
            @keyframes voiceDots {
              0%   { opacity: 0.2; }
              50%  { opacity: 1; }
              100% { opacity: 0.2; }
            }
          `}</style>
        </main>
      )}

      {/* ── Review stage ── */}
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
            ${isIncome ? 'border-emerald-500/30' : 'border-red-500/30'}`}
            
          
          >
            <label className="block text-[11px] font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-2">
              {isIncome ? 'Uang Masuk' : 'Uang Keluar'}
            </label>
            <div className="flex items-baseline gap-2">
              <span className={`text-lg font-medium ${isIncome ? 'text-emerald-500' : 'text-red-500'}`}>Rp</span>
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
              style={{ backgroundColor: isIncome ? '#10b981' : '#1d6af5' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {saving ? 'Menyimpan...' : isIncome ? 'Simpan Pemasukan' : 'Simpan Pengeluaran'}
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
    </div>
  )
}
