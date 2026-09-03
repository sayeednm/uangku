'use client'

interface DashboardErrorProps {
  onRetry: () => void
}

export default function DashboardError({ onRetry }: DashboardErrorProps) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Data belum dapat dimuat</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Coba muat ulang halaman.</p>
      <button
        onClick={onRetry}
        className="mt-4 btn-primary"
      >
        Coba Lagi
      </button>
    </div>
  )
}
