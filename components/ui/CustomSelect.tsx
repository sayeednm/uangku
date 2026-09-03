'use client'

import { useState, useRef, useEffect } from 'react'

interface Option {
  value: string
  label: string
  icon?: string | null
}

interface CustomSelectProps {
  id?: string
  name: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

export default function CustomSelect({
  id, name, value, onChange, options, placeholder = 'Pilih...', disabled, required,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      {/* Hidden native input for form submission */}
      <input type="hidden" name={name} value={value} required={required} />

      {/* Trigger */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={`
          w-full flex items-center justify-between gap-2
          px-3.5 py-3 rounded-xl text-sm text-left
          bg-gray-50 dark:bg-gray-800 border transition-all duration-150
          ${open
            ? 'border-gray-900 dark:border-white ring-2 ring-gray-900 dark:ring-white ring-offset-0 bg-white dark:bg-gray-800'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-400 dark:text-gray-500'}>
          {selected ? (
            <span className="flex items-center gap-2">
              {selected.icon && <span className="text-base leading-none">{selected.icon}</span>}
              {selected.label}
            </span>
          ) : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden animate-scale-in"
          role="listbox"
        >
          <div className="max-h-52 overflow-y-auto py-1">
            {options.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">Tidak ada pilihan</p>
            ) : (
              options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={value === opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className={`
                    w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors duration-100
                    ${value === opt.value
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  {opt.icon && <span className="text-base leading-none">{opt.icon}</span>}
                  {opt.label}
                  {value === opt.value && (
                    <svg className="w-4 h-4 ml-auto text-gray-900 dark:text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
