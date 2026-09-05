'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const TOUR_KEY = 'uangku_tour_done'

const STEPS = [
  {
    title: 'Selamat datang di Uangku! 🎉',
    desc: 'Kami akan memandu Anda dalam 3 langkah singkat.',
    icon: '👋',
  },
  {
    title: 'Tambah Rekening',
    desc: 'Mulai dengan menambahkan rekening bank, e-wallet, atau dompet tunai Anda.',
    icon: '🏦',
    cta: { label: 'Tambah Rekening', href: '/rekening/baru' },
  },
  {
    title: 'Catat Transaksi',
    desc: 'Gunakan tombol + di navbar bawah untuk mencatat pemasukan dan pengeluaran.',
    icon: '✏️',
  },
  {
    title: 'Siap digunakan!',
    desc: 'Dashboard akan otomatis menampilkan ringkasan keuangan Anda.',
    icon: '🚀',
  },
]

export default function OnboardingTour() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      // Small delay so it doesn't pop up immediately
      setTimeout(() => {
        setVisible(true)
        setTimeout(() => setAnimating(true), 50)
      }, 1000)
    }
  }, [])

  const dismiss = () => {
    setAnimating(false)
    setTimeout(() => {
      setVisible(false)
      localStorage.setItem(TOUR_KEY, '1')
    }, 300)
  }

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else dismiss()
  }

  if (!visible) return null

  const current = STEPS[step]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(3px)',
          opacity: animating ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Tour card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tur aplikasi Uangku"
        className="bg-white dark:bg-[#141418]"
        style={{
          position: 'fixed',
          bottom: 80,
          left: 16,
          right: 16,
          zIndex: 61,
          borderRadius: 24,
          padding: 24,
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
          transform: animating ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          opacity: animating ? 1 : 0,
          transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                flex: i === step ? 2 : 1,
                backgroundColor: i === step ? '#1d6af5' : i < step ? '#93c5fd' : '#e5e7eb',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-4xl mb-3">{current.icon}</div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5">
          {current.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
          {current.desc}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {current.cta && (
            <Link
              href={current.cta.href}
              onClick={dismiss}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-center"
              style={{ backgroundColor: '#1d6af5', color: '#fff' }}
            >
              {current.cta.label}
            </Link>
          )}
          <button
            onClick={next}
            className={`py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
              current.cta ? 'px-5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300' : 'flex-1 text-white'
            }`}
            style={!current.cta ? { backgroundColor: '#1d6af5' } : {}}
          >
            {step < STEPS.length - 1 ? 'Lanjut' : 'Mulai'}
          </button>
          {!current.cta && (
            <button
              onClick={dismiss}
              className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 transition-colors"
            >
              Lewati
            </button>
          )}
        </div>
      </div>
    </>
  )
}
