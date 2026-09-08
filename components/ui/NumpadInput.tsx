'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils/currency'

interface NumpadInputProps {
  name: string
  defaultValue?: number
  onChange?: (value: number) => void
}

const KEYS = [
  '7', '8', '9',
  '4', '5', '6',
  '1', '2', '3',
  '000', '0', '⌫',
]

export default function NumpadInput({ name, defaultValue, onChange }: NumpadInputProps) {
  const [digits, setDigits] = useState(defaultValue ? String(defaultValue) : '')

  useEffect(() => {
    if (defaultValue) setDigits(String(defaultValue))
  }, [defaultValue])

  const press = (key: string) => {
    setDigits(prev => {
      let next = prev
      if (key === '⌫') {
        next = prev.slice(0, -1)
      } else if (key === '000') {
        next = prev === '' ? '' : prev + '000'
      } else {
        if (prev === '0') next = key
        else next = prev + key
      }
      // Max 12 digits (999,999,999,999)
      if (next.length > 12) return prev
      onChange?.(next ? parseInt(next, 10) : 0)
      return next
    })
  }

  const value = digits ? parseInt(digits, 10) : 0

  return (
    <div>
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={digits || '0'} />

      {/* Display */}
      <div className="text-center py-4 border-b border-gray-100 dark:border-white/[0.06] mb-2">
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Nominal</p>
        <p className={`text-4xl font-bold tabular-nums tracking-tight transition-all ${
          value > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600'
        }`}>
          {value > 0 ? formatCurrency(value) : 'Rp 0'}
        </p>
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2 px-1">
        {KEYS.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            className={`
              h-14 rounded-2xl text-lg font-semibold
              transition-all duration-100 active:scale-[0.92]
              select-none
              ${key === '⌫'
                ? 'bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 text-xl'
                : 'bg-gray-100 dark:bg-white/[0.06] text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/[0.1]'
              }
            `}
          >
            {key === '⌫' ? (
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
              </svg>
            ) : key}
          </button>
        ))}
      </div>
    </div>
  )
}
