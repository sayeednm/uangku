'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function ExportButton() {
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()

  const handleExport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      const dateFrom = searchParams.get('date_from')
      const dateTo = searchParams.get('date_to')
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      const url = `/api/export/transactions${params.toString() ? `?${params}` : ''}`
      const res = await fetch(url)

      if (!res.ok) throw new Error('Export gagal')

      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `uangku-transaksi-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch {
      alert('Gagal mengekspor data. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
        bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1]
        text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.1]
        transition-all duration-150 active:scale-95 disabled:opacity-50"
      aria-label="Export CSV"
    >
      {loading ? (
        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )}
      {loading ? 'Mengekspor...' : 'Export CSV'}
    </button>
  )
}
