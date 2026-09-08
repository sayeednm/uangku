'use client'

import { useRef, useState, ReactNode } from 'react'

interface SwipeToDeleteProps {
  children: ReactNode
  onDelete: () => void
  disabled?: boolean
}

export default function SwipeToDelete({ children, onDelete, disabled }: SwipeToDeleteProps) {
  const [offset, setOffset] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef(false)
  const THRESHOLD = 80 // px to trigger delete

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isHorizontal.current = false
    setSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !swiping) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    // Determine direction on first significant movement
    if (!isHorizontal.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy)
    }

    if (!isHorizontal.current) return

    // Only allow left swipe (negative dx)
    if (dx > 0) { setOffset(0); return }
    const newOffset = Math.max(dx, -120)
    setOffset(newOffset)
  }

  const handleTouchEnd = () => {
    if (disabled) return
    setSwiping(false)

    if (offset < -THRESHOLD) {
      // Trigger delete with animation
      setOffset(-120)
      setTimeout(() => {
        setDeleted(true)
        onDelete()
      }, 150)
    } else {
      // Snap back
      setOffset(0)
    }
  }

  if (deleted) return null

  return (
    <div className="relative overflow-hidden">
      {/* Delete button revealed on swipe */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-red-500 px-5"
        style={{
          opacity: offset < -20 ? Math.min(Math.abs(offset) / 80, 1) : 0,
          transition: swiping ? 'none' : 'opacity 0.2s ease',
        }}
        aria-hidden="true"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
