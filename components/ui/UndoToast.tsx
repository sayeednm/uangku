'use client'

/**
 * UndoToast — shows a toast with an undo button.
 * Used after delete actions. The actual delete is delayed 4 seconds.
 * If user clicks Undo before the timer expires, delete is cancelled.
 */

import { useEffect, useRef, useState } from 'react'

interface UndoToastOptions {
  message: string
  onUndo: () => void
  onConfirm: () => void
  duration?: number
}

export function useUndoToast() {
  const [visible, setVisible] = useState(false)
  const [options, setOptions] = useState<UndoToastOptions | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [progress, setProgress] = useState(100)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const show = (opts: UndoToastOptions) => {
    // Cancel any existing timer
    if (timerRef.current) clearTimeout(timerRef.current)
    if (progressRef.current) clearInterval(progressRef.current)

    setOptions(opts)
    setVisible(true)
    setProgress(100)

    const dur = opts.duration ?? 4500
    const step = 50
    const decrement = (step / dur) * 100

    progressRef.current = setInterval(() => {
      setProgress(p => Math.max(0, p - decrement))
    }, step)

    timerRef.current = setTimeout(() => {
      opts.onConfirm()
      setVisible(false)
      if (progressRef.current) clearInterval(progressRef.current)
    }, dur)
  }

  const undo = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (progressRef.current) clearInterval(progressRef.current)
    options?.onUndo()
    setVisible(false)
  }

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (progressRef.current) clearInterval(progressRef.current)
    options?.onConfirm()
    setVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (progressRef.current) clearInterval(progressRef.current)
    }
  }, [])

  const UndoToastComponent = visible && options ? (
    <div
      className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-up"
      style={{ minWidth: 280, maxWidth: 360 }}
    >
      <div className="bg-[#111827] dark:bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Progress bar */}
        <div
          className="h-0.5 bg-[#1d6af5] transition-none"
          style={{ width: `${progress}%` }}
        />
        <div className="flex items-center gap-3 px-4 py-3">
          <p className="text-sm font-medium text-white dark:text-gray-900 flex-1">
            {options.message}
          </p>
          <button
            onClick={undo}
            className="text-sm font-bold text-[#60a5fa] dark:text-[#1d6af5] hover:opacity-80 transition-opacity flex-shrink-0"
          >
            Batalkan
          </button>
          <button
            onClick={dismiss}
            className="w-5 h-5 flex items-center justify-center text-white/40 dark:text-gray-400 hover:text-white/70 transition-colors"
            aria-label="Tutup"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { show, UndoToastComponent }
}
