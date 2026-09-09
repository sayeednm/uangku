'use client'

import { useRef, useState } from 'react'

interface ScanResult {
  amount: number
  description: string
  date: string | null
  category: string
  confidence: number
}

interface ScanReceiptButtonProps {
  onResult: (result: ScanResult) => void
}

export default function ScanReceiptButton({ onResult }: ScanReceiptButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? 'Gagal membaca struk')
        return
      }

      onResult(data)
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setScanning(false)
      // Reset input so same file can be selected again
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Foto struk"
      />

      <button
        type="button"
        onClick={() => {
          setError(null)
          inputRef.current?.click()
        }}
        disabled={scanning}
        className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold
          border-2 border-dashed border-[#1d6af5]/30 dark:border-[#1d6af5]/20
          text-[#1d6af5] dark:text-[#60a5fa]
          hover:bg-[#1d6af5]/5 dark:hover:bg-[#1d6af5]/10
          active:scale-[0.98] transition-all duration-150
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {scanning ? (
          <>
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Membaca struk...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Foto Struk Otomatis</span>
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-500 mt-1.5 text-center">{error}</p>
      )}

      {!scanning && !error && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1.5">
          AI akan membaca nominal, toko, dan tanggal secara otomatis
        </p>
      )}
    </div>
  )
}
