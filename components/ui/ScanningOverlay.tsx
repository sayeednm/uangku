'use client'

import { useEffect, useState } from 'react'

interface ScanningOverlayProps {
  visible: boolean
  imageUrl?: string
}

export default function ScanningOverlay({ visible, imageUrl }: ScanningOverlayProps) {
  const [show, setShow] = useState(false)
  const [appear, setAppear] = useState(false)

  useEffect(() => {
    if (visible) {
      setShow(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setAppear(true)))
    } else {
      setAppear(false)
      const t = setTimeout(() => setShow(false), 400)
      return () => clearTimeout(t)
    }
  }, [visible])

  if (!show) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.85)',
        opacity: appear ? 1 : 0,
        transition: 'opacity 0.3s ease',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Scanner frame */}
      <div style={{ position: 'relative', width: 280, height: 380 }}>
        {/* Preview image if available */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 12,
              opacity: 0.4,
            }}
          />
        )}

        {/* Corner brackets */}
        {[
          { top: 0, left: 0, borderTop: '3px solid #1d6af5', borderLeft: '3px solid #1d6af5', borderRadius: '8px 0 0 0' },
          { top: 0, right: 0, borderTop: '3px solid #1d6af5', borderRight: '3px solid #1d6af5', borderRadius: '0 8px 0 0' },
          { bottom: 0, left: 0, borderBottom: '3px solid #1d6af5', borderLeft: '3px solid #1d6af5', borderRadius: '0 0 0 8px' },
          { bottom: 0, right: 0, borderBottom: '3px solid #1d6af5', borderRight: '3px solid #1d6af5', borderRadius: '0 0 8px 0' },
        ].map((style, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 28,
              height: 28,
              ...style,
            }}
          />
        ))}

        {/* Scanning line */}
        <div style={{
          position: 'absolute',
          left: 4,
          right: 4,
          height: 2,
          background: 'linear-gradient(90deg, transparent, #1d6af5, #60a5fa, #1d6af5, transparent)',
          boxShadow: '0 0 12px rgba(29,106,245,0.8), 0 0 24px rgba(29,106,245,0.4)',
          borderRadius: 1,
          animation: 'scanLine 1.8s ease-in-out infinite',
        }} />

        {/* Overlay grid lines for scan effect */}
        <div style={{
          position: 'absolute',
          inset: 4,
          backgroundImage: 'linear-gradient(rgba(29,106,245,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(29,106,245,0.05) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          borderRadius: 8,
        }} />
      </div>

      {/* Label */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            backgroundColor: '#1d6af5',
            animation: 'pulse 1s ease-in-out infinite',
          }} />
          <p style={{ color: '#ffffff', fontSize: 15, fontWeight: 600, margin: 0 }}>
            Membaca struk...
          </p>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>
          Harap tunggu sebentar
        </p>
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { top: 4px; }
          50%  { top: calc(100% - 6px); }
          100% { top: 4px; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  )
}
