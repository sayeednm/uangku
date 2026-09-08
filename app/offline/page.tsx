'use client'

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-[#F0F4FF] dark:bg-[#0A0C14]">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
        </svg>
      </div>
      <p className="text-lg font-bold text-gray-700 dark:text-gray-300">Tidak ada koneksi</p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-6 max-w-xs leading-relaxed">
        Periksa koneksi internet Anda dan coba lagi.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: '#1d6af5', color: '#fff', border: 'none',
          padding: '10px 20px', borderRadius: 12, fontSize: 14,
          fontWeight: 600, cursor: 'pointer',
        }}
      >
        Coba Lagi
      </button>
    </div>
  )
}
