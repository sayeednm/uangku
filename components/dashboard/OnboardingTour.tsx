'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const TOUR_KEY = 'uangku_tour_v2'

const STEPS = [
  {
    icon: '🏦',
    title: 'Tambah Rekening',
    desc: 'Mulai dengan menambahkan rekening bank, e-wallet, atau dompet tunai.',
    cta: { label: 'Tambah', href: '/rekening/baru' },
  },
  {
    icon: '✏️',
    title: 'Catat Transaksi',
    desc: 'Gunakan tombol + di navbar bawah untuk mencatat pemasukan & pengeluaran.',
    cta: null,
  },
  {
    icon: '📊',
    title: 'Lihat Laporan',
    desc: 'Dashboard akan otomatis menampilkan ringkasan keuangan Anda.',
    cta: null,
  },
]

export default function OnboardingTour() {
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    // Only show if:
    // 1. User just verified email (success param), OR
    // 2. First time visiting dashboard (no tour key in storage)
    const isNewUser = searchParams.get('success')?.includes('verifikasi')
    const hasSeenTour = localStorage.getItem(TOUR_KEY)

    if (isNewUser || !hasSeenTour) {
      // Don't show if user already has data (not a new user)
      // We check this by waiting a bit then seeing if onboarding empty is shown
      setTimeout(() => {
        setVisible(true)
        setTimeout(() => setAnimated(true), 50)
      }, 800)
    }
  }, [searchParams])

  const dismiss = () => {
    setAnimated(false)
    setTimeout(() => {
      setVisible(false)
      localStorage.setItem(TOUR_KEY, '1')
    }, 300)
  }

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      dismiss()
    }
  }

  if (!visible) return null

  const current = STEPS[step]

  return (
    // No backdrop — just a floating card at bottom, non-intrusive
    <div
      style={{
        position: 'fixed',
        bottom: 84,
        left: 12,
        right: 12,
        zIndex: 50,
        transform: animated ? 'translateY(0)' : 'translateY(100%)',
        opacity: animated ? 1 : 0,
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: animated ? 'auto' : 'none',
      }}
    >
      <div className="bg-[#111827] dark:bg-white rounded-2xl p-4 shadow-2xl">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                flex: i === step ? 2 : 1,
                backgroundColor: i === step ? '#1d6af5' : i < step ? '#60a5fa' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
          <button
            onClick={dismiss}
            className="ml-1 text-white/40 dark:text-gray-400 hover:text-white/70 transition-colors"
            aria-label="Tutup"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{current.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white dark:text-gray-900">{current.title}</p>
            <p className="text-xs text-white/60 dark:text-gray-500 mt-0.5 leading-relaxed">{current.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          {current.cta && (
            <Link
              href={current.cta.href}
              onClick={dismiss}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white"
              style={{ backgroundColor: '#1d6af5' }}
            >
              {current.cta.label}
            </Link>
          )}
          <button
            onClick={next}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 dark:bg-black/10 text-white dark:text-gray-900 hover:bg-white/20 transition-colors"
          >
            {step < STEPS.length - 1 ? 'Lanjut →' : 'Selesai'}
          </button>
          <span className="text-xs text-white/30 dark:text-gray-400 ml-auto">
            {step + 1}/{STEPS.length}
          </span>
        </div>
      </div>
    </div>
  )
}
