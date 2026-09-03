'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const STORAGE_KEY = 'uangku_pwa_installed'

type BannerState = 'hidden' | 'full' | 'mini'

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [state, setState] = useState<BannerState>('hidden')
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Never show if already installed
    if (localStorage.getItem(STORAGE_KEY)) return
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if ((navigator as { standalone?: boolean }).standalone === true) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setState('full'), 2800)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem(STORAGE_KEY, '1')
      setState('hidden')
    } else {
      setInstalling(false)
    }
  }

  // Minimize to pill — does NOT permanently dismiss
  const minimize = () => setState('mini')

  // Expand back to full from pill
  const expand = () => setState('full')

  if (state === 'hidden') return null

  // ── Mini pill ─────────────────────────────────────────────────────────────
  if (state === 'mini') {
    return (
      <button
        onClick={expand}
        aria-label="Pasang aplikasi Uangku"
        className="fixed bottom-24 right-4 z-[60] flex items-center gap-2
          bg-[#111827] dark:bg-white
          text-white dark:text-gray-900
          px-3.5 py-2.5 rounded-full shadow-xl
          text-xs font-semibold
          active:scale-95 transition-all duration-200
          animate-fade-up"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Pasang app
      </button>
    )
  }

  // ── Full banner ───────────────────────────────────────────────────────────
  return (
    <div
      className="fixed bottom-[84px] left-4 right-4 z-[60] animate-fade-up"
      role="banner"
      aria-label="Instal aplikasi Uangku"
    >
      <div className="bg-[#111827] dark:bg-white rounded-2xl p-4 shadow-2xl flex items-center gap-3">
        {/* App icon */}
        <div className="w-11 h-11 rounded-xl bg-white/10 dark:bg-black/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white dark:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white dark:text-gray-900 leading-tight">
            Pasang Uangku
          </p>
          <p className="text-[11px] text-white/55 dark:text-gray-500 mt-0.5">
            Akses lebih cepat dari homescreen
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleInstall}
            disabled={installing}
            className="px-3 py-2 rounded-xl bg-white dark:bg-gray-900
              text-[#111827] dark:text-white text-xs font-bold
              active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            {installing ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : 'Pasang'}
          </button>

          {/* Minimize — NOT dismiss */}
          <button
            onClick={minimize}
            className="w-7 h-7 rounded-lg flex items-center justify-center
              text-white/40 dark:text-gray-400
              hover:text-white/70 dark:hover:text-gray-600
              transition-colors"
            aria-label="Perkecil"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
