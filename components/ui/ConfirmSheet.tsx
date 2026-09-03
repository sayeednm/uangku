'use client'

import { useEffect, useState } from 'react'

interface ConfirmSheetProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  isPending?: boolean
  danger?: boolean
}

export default function ConfirmSheet({
  isOpen, onClose, onConfirm,
  title, description,
  confirmLabel = 'Konfirmasi',
  isPending = false,
  danger = true,
}: ConfirmSheetProps) {
  const [visible, setVisible] = useState(false)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)))
    } else {
      setAnimated(false)
      const t = setTimeout(() => setVisible(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  if (!visible) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(2px)',
          opacity: animated ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="bg-white dark:bg-[#141418]"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          transform: animated ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full bg-gray-200 dark:bg-white/20" />
        </div>

        <div className="px-5 pt-2 pb-4">
          <h2 id="confirm-title" className="text-base font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="px-4 space-y-2 pb-2">
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 ${
              danger
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-[#111827] dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
            }`}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Menghapus...
              </span>
            ) : confirmLabel}
          </button>
          <button
            onClick={onClose}
            disabled={isPending}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold
              bg-gray-100 dark:bg-white/[0.07]
              text-gray-700 dark:text-gray-300
              hover:bg-gray-200 dark:hover:bg-white/[0.1]
              active:scale-[0.98] transition-all duration-150"
          >
            Batal
          </button>
        </div>
      </div>
    </>
  )
}
