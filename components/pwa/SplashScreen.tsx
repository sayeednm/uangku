'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function SplashScreen() {
  const [phase, setPhase] = useState<'show' | 'fadeout' | 'done'>('show')

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase('fadeout'), 1600)
    const doneTimer = setTimeout(() => setPhase('done'), 2100)
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer) }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      aria-hidden="true"
      className="dark:!bg-[#0A0C14]"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #EEF4FF 0%, #F0F4FF 50%, #E8F0FE 100%)',
        opacity: phase === 'fadeout' ? 0 : 1,
        transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'none',
      }}
    >
      {/* Logo */}
      <div style={{ animation: 'splashLogo 0.65s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
        <Image
          src="/logo.png"
          alt="Uangku"
          width={100}
          height={100}
          className="rounded-[28px] shadow-[0_12px_40px_rgba(29,106,245,0.35)]"
          priority
        />
      </div>

      {/* App name */}
      <div
        className="text-center"
        style={{ animation: 'splashText 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both' }}
      >
        <p style={{
          marginTop: 20,
          fontSize: 24,
          fontWeight: 800,
          color: '#111827',
          letterSpacing: '-0.5px',
        }}>
          Uangku
        </p>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
          Kelola keuangan dengan mudah
        </p>
      </div>

      {/* Loading bar */}
      <div
        style={{
          marginTop: 48,
          width: 48,
          height: 3,
          borderRadius: 2,
          backgroundColor: '#dbeafe',
          overflow: 'hidden',
          animation: 'splashText 0.4s ease 0.5s both',
        }}
      >
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1d6af5',
          borderRadius: 2,
          transformOrigin: 'left',
          animation: 'loadBar 1.2s cubic-bezier(0.4, 0, 0.2, 1) 0.6s both',
        }} />
      </div>

      <style>{`
        @keyframes splashLogo {
          from { opacity: 0; transform: scale(0.65) translateY(24px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes splashText {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes loadBar {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }

        @media (prefers-color-scheme: dark) {
          .dark-splash {
            background: linear-gradient(160deg, #0D1321 0%, #0A0C14 50%, #0D1221 100%) !important;
          }
        }
      `}</style>
    </div>
  )
}
