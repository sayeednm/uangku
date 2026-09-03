'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AddActionSheetProps {
  isOpen: boolean
  onClose: () => void
}

const ACTIONS = [
  {
    href: '/transaksi/baru?type=expense',
    label: 'Pengeluaran',
    desc: 'Catat uang keluar',
    iconBg: 'rgba(239,68,68,0.12)',
    iconColor: '#ef4444',
    icon: 'M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    href: '/transaksi/baru?type=income',
    label: 'Pemasukan',
    desc: 'Catat uang masuk',
    iconBg: 'rgba(16,185,129,0.12)',
    iconColor: '#10b981',
    icon: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    href: '/transfer/baru',
    label: 'Transfer',
    desc: 'Pindahkan antar rekening',
    iconBg: 'rgba(99,102,241,0.12)',
    iconColor: '#6366f1',
    icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  },
]

export default function AddActionSheet({ isOpen, onClose }: AddActionSheetProps) {
  const router = useRouter()
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

  const handleAction = (href: string) => {
    onClose()
    setTimeout(() => router.push(href), 300)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          backgroundColor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
          opacity: animated ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tambah transaksi"
        className="bg-white dark:bg-[#141418]"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
          transform: animated ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-gray-200 dark:bg-white/20" />
        </div>

        {/* Title */}
        <div className="px-5 py-3">
          <p className="text-base font-bold text-gray-900 dark:text-white">Tambah</p>
        </div>

        {/* Actions */}
        <div className="px-4 space-y-1">
          {ACTIONS.map(action => (
            <button
              key={action.href}
              onClick={() => handleAction(action.href)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl
                hover:bg-gray-50 dark:hover:bg-white/[0.05]
                active:scale-[0.98] transition-all duration-150 text-left"
            >
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: action.iconBg }}
              >
                <svg width={22} height={22} fill="none" stroke={action.iconColor}
                  viewBox="0 0 24 24" strokeWidth={1.75} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                </svg>
              </div>

              {/* Text */}
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight">
                  {action.label}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {action.desc}
                </p>
              </div>

              <svg className="w-4 h-4 text-gray-300 dark:text-white/20 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Cancel */}
        <div className="px-4 pt-3">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold
              bg-gray-100 dark:bg-white/[0.07]
              text-gray-600 dark:text-gray-300
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
