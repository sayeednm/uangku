'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/ui/BackButton'
import CustomSelect from '@/components/ui/CustomSelect'
import { formatCurrency } from '@/lib/utils/currency'
import { quickSaveExpenseAction } from '@/lib/transaksi/actions'

interface ScanClientProps {
  accounts: { id: string; name: string; type: string }[]
  expenseCategories: { id: string; name: string; icon: string | null }[]
}

interface ScanResult {
  amount: number
  description: string
  date: string | null
  category: string
  confidence: string
}

type Stage = 'capture' | 'scanning' | 'review'

// Downscale + recompress to keep uploads small: phone cameras produce
// 3–8MB JPEGs, and large uploads are slow on mobile data and can hit the
// Vercel 4.5MB request body limit after base64 encoding.
async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const maxDim = 1600
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    )
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    // Browser can't decode (e.g. HEIC) — send the original and let the server try
    return file
  }
}

const todayISO = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function ScanClient({ accounts, expenseCategories }: ScanClientProps) {
  const router = useRouter()

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stage, setStage] = useState<Stage>('capture')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  // Review state
  const [result, setResult] = useState<ScanResult | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  // Start live camera whenever the capture stage is shown.
  // Runs again after a failed scan or "Scan Ulang" — the previous stream is
  // stopped, so the viewfinder needs a fresh getUserMedia each time.
  useEffect(() => {
    if (stage !== 'capture') return
    let cancelled = false

    async function startCamera() {
      setCameraError(null)
      setCameraReady(false)
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('Kamera tidak tersedia di perangkat ini. Gunakan tombol galeri di bawah.')
          return
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setCameraReady(true)
        }
      } catch {
        if (!cancelled) {
          setCameraError('Tidak bisa mengakses kamera. Gunakan tombol galeri di bawah.')
        }
      }
    }

    startCamera()
    return () => {
      cancelled = true
      stopCamera()
    }
  }, [stage, stopCamera])

  // ── Scan pipeline ──────────────────────────────────────────────────────────

  const runScan = useCallback(async (rawFile: File) => {
    setScanError(null)
    setStage('scanning')
    stopCamera()

    const file = await compressImage(rawFile)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    try {
      const formData = new FormData()
      formData.append('image', file)

      // Abort gracefully if the network/AI call stalls (flaky mobile data)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 45_000)
      let res: Response
      try {
        res = await fetch('/api/scan-receipt', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timer)
      }
      const data = await res.json()

      if (!res.ok || data.error) {
        setScanError(data.error ?? 'Gagal membaca struk')
        setStage('capture')
        return
      }

      // Populate review card
      setResult(data)
      setAmount(data.amount > 0 ? String(data.amount) : '')
      setDescription(data.description ?? '')
      setDate(data.date ?? todayISO())
      const match = expenseCategories.find(
        c => c.name.trim().toLowerCase() === String(data.category ?? '').trim().toLowerCase()
      )
      setCategoryId(match?.id ?? '')
      setStage('review')
    } catch (err) {
      setScanError(
        err instanceof DOMException && err.name === 'AbortError'
          ? 'Waktu tunggu habis. Periksa koneksi internet lalu coba lagi.'
          : 'Terjadi kesalahan. Coba lagi.'
      )
      setStage('capture')
    } finally {
      URL.revokeObjectURL(url)
      setPreviewUrl(null)
    }
  }, [expenseCategories, stopCamera])

  const capture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)

    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], 'struk.jpg', { type: 'image/jpeg' })
      runScan(file)
    }, 'image/jpeg', 0.92)
  }, [runScan])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) runScan(file)
    // Reset so the same file can be re-selected after a failure
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Review actions ─────────────────────────────────────────────────────────

  const rescan = () => {
    setResult(null)
    setSaveError(null)
    setStage('capture')
  }

  const save = async () => {
    const amountNum = parseInt(amount.replace(/\D/g, ''), 10) || 0
    if (amountNum <= 0) { setSaveError('Nominal harus lebih dari 0'); return }
    if (!accountId) { setSaveError('Rekening wajib dipilih'); return }
    if (!categoryId) { setSaveError('Kategori wajib dipilih'); return }

    setSaving(true)
    setSaveError(null)
    const { error } = await quickSaveExpenseAction({
      amount: amountNum,
      account_id: accountId,
      category_id: categoryId,
      transaction_date: date,
      description: description || undefined,
    })

    if (error) {
      setSaveError(error)
      setSaving(false)
      return
    }
    router.push('/transaksi?success=Pengeluaran+berhasil+dicatat')
  }

  const continueToForm = () => {
    const params = new URLSearchParams({ scan: '1' })
    const amountNum = amount.replace(/\D/g, '')
    if (amountNum && parseInt(amountNum, 10) > 0) params.set('amount', amountNum)
    if (description) params.set('desc', description)
    if (date) params.set('date', date)
    const matched = expenseCategories.find(c => c.id === categoryId)
    if (matched) params.set('category', matched.name)
    router.push(`/transaksi/baru?${params.toString()}`)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const confidence = Number(result?.confidence) || 0
  const confidenceLabel = confidence >= 0.75 ? 'Akurat' : confidence >= 0.4 ? 'Periksa kembali' : 'Kurang yakin'
  const confidenceColor = confidence >= 0.75 ? '#10b981' : confidence >= 0.4 ? '#f59e0b' : '#ef4444'

  return (
    <div className={`min-h-screen ${stage === 'review'
      ? 'bg-[#F0F4FF] dark:bg-[#0A0C14] text-gray-900 dark:text-white'
      : 'bg-[#0A0C14] text-white'}`}>
      {/* Top bar */}
      <header className={`sticky top-0 z-20 flex items-center gap-3 px-4 h-14 backdrop-blur-xl border-b
        ${stage === 'review'
          ? 'bg-white/95 dark:bg-[#0A0C14]/95 border-gray-200/50 dark:border-white/[0.06]'
          : 'bg-[#0A0C14]/95 border-white/[0.06]'}`}>
        <BackButton label="" />
        <h1 className="text-base font-bold tracking-tight">Scan Struk</h1>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Capture stage ── */}
      {stage === 'capture' && (
        <main className="max-w-lg mx-auto px-4 pb-32">
          {/* Viewfinder */}
          <div className="relative mt-4 rounded-3xl overflow-hidden bg-black" style={{ aspectRatio: '3/4' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Frame overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-8 rounded-2xl border border-white/25" />
              {[
                { top: 24, left: 24, borderTop: '3px solid #1d6af5', borderLeft: '3px solid #1d6af5', borderRadius: '12px 0 0 0' },
                { top: 24, right: 24, borderTop: '3px solid #1d6af5', borderRight: '3px solid #1d6af5', borderRadius: '0 12px 0 0' },
                { bottom: 24, left: 24, borderBottom: '3px solid #1d6af5', borderLeft: '3px solid #1d6af5', borderRadius: '0 0 0 12px' },
                { bottom: 24, right: 24, borderBottom: '3px solid #1d6af5', borderRight: '3px solid #1d6af5', borderRadius: '0 0 12px 0' },
              ].map((s, i) => (
                <div key={i} className="absolute w-8 h-8" style={s} />
              ))}
              <p className="absolute inset-x-0 bottom-10 text-center text-xs text-white/70">
                Posisikan struk di dalam bingkai
              </p>
            </div>

            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center">
                <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm text-white/60">{cameraError}</p>
              </div>
            )}
          </div>

          {/* Shutter row */}
          <div className="mt-6 flex items-center justify-center gap-8">
            {/* Gallery pick */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14]
                flex items-center justify-center active:scale-95 transition-all"
              aria-label="Pilih dari galeri"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Shutter */}
            <button
              type="button"
              onClick={capture}
              disabled={!!cameraError || !cameraReady}
              className="w-[72px] h-[72px] rounded-full
                ring-4 ring-white/30 ring-offset-4 ring-offset-[#0A0C14]
                bg-white active:scale-90 disabled:opacity-40 disabled:active:scale-100
                transition-all duration-150"
              aria-label="Ambil foto"
            />

            {/* (spacer to keep shutter centered) */}
            <div className="w-12 h-12" />
          </div>

          {scanError && (
            <p className="mt-4 text-sm text-red-400 text-center">{scanError}</p>
          )}

          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} className="hidden" />
        </main>
      )}

      {/* ── Scanning stage ── */}
      {stage === 'scanning' && (
        <main className="max-w-lg mx-auto px-4">
          <div className="relative mt-4 rounded-3xl overflow-hidden bg-black" style={{ aspectRatio: '3/4' }}>
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- blob: preview URL, not optimizable
              <img src={previewUrl} alt="Struk" className="absolute inset-0 w-full h-full object-cover opacity-40" />
            )}

            {/* Scan line */}
            <div
              className="absolute left-4 right-4 h-0.5 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, #1d6af5, #60a5fa, #1d6af5, transparent)',
                boxShadow: '0 0 12px rgba(29,106,245,0.8), 0 0 24px rgba(29,106,245,0.4)',
                animation: 'scanPageLine 1.8s ease-in-out infinite',
              }}
            />

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#1d6af5]" style={{ animation: 'pulseDot 1s ease-in-out infinite' }} />
              <p className="text-[15px] font-semibold">Membaca struk...</p>
              <p className="text-xs text-white/50">Harap tunggu sebentar</p>
            </div>
          </div>

          <style>{`
            @keyframes scanPageLine {
              0%   { top: 8%; }
              50%  { top: 90%; }
              100% { top: 8%; }
            }
            @keyframes pulseDot {
              0%, 100% { opacity: 1; transform: scale(1); }
              50%      { opacity: 0.5; transform: scale(0.8); }
            }
          `}</style>
        </main>
      )}

      {/* ── Review stage ── */}
      {stage === 'review' && result && (
        <main className="max-w-lg mx-auto px-4 pb-32 pt-4">
          {/* Confidence banner */}
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: confidenceColor }} />
            <p className="text-xs font-semibold" style={{ color: confidenceColor }}>
              {confidenceLabel}
            </p>
            <p className="text-xs text-gray-400 dark:text-white/40">— periksa detail sebelum menyimpan</p>
          </div>

          {/* Amount */}
          <div className="bg-white dark:bg-white/[0.05] border border-gray-200/60 dark:border-white/[0.08] rounded-2xl p-4">
            <label className="block text-[11px] font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-2">
              Nominal
            </label>
            <div className="flex items-baseline gap-2">
              <span className="text-lg text-gray-400 dark:text-white/40 font-medium">Rp</span>
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
                id="scan-category"
                name="scan-category"
                value={categoryId}
                onChange={setCategoryId}
                placeholder="Pilih kategori"
                options={expenseCategories.map(c => ({ value: c.id, label: c.name, icon: c.icon }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-2">
                Rekening
              </label>
              <CustomSelect
                id="scan-account"
                name="scan-account"
                value={accountId}
                onChange={setAccountId}
                placeholder="Pilih rekening"
                options={accounts.map(a => ({ value: a.id, label: a.name }))}
              />
            </div>

            <div>
              <label htmlFor="scan-date" className="block text-[11px] font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-2">
                Tanggal
              </label>
              <input
                id="scan-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="input [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>

            <div>
              <label htmlFor="scan-desc" className="block text-[11px] font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-2">
                Keterangan <span className="font-normal normal-case text-gray-300 dark:text-white/30">(opsional)</span>
              </label>
              <input
                id="scan-desc"
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="input"
                maxLength={200}
                placeholder="Contoh: Indomaret"
              />
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
              className="btn-primary w-full disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={rescan}
                className="btn-secondary"
              >
                Scan Ulang
              </button>
              <button
                type="button"
                onClick={continueToForm}
                className="btn-secondary"
              >
                Edit Detail
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
