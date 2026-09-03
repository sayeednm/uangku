'use client'

import { useState, useEffect } from 'react'

interface CurrencyInputProps {
  id?: string
  name: string
  defaultValue?: number
  disabled?: boolean
  autoFocus?: boolean
  placeholder?: string
  onChange?: (raw: number) => void
}

function formatDisplay(raw: string): string {
  const num = raw.replace(/\D/g, '')
  if (!num) return ''
  return new Intl.NumberFormat('id-ID').format(parseInt(num, 10))
}

export default function CurrencyInput({
  id, name, defaultValue, disabled, autoFocus, placeholder = '0', onChange,
}: CurrencyInputProps) {
  const [display, setDisplay] = useState(
    defaultValue && defaultValue > 0 ? formatDisplay(String(defaultValue)) : ''
  )
  const [rawValue, setRawValue] = useState(
    defaultValue && defaultValue > 0 ? String(defaultValue) : ''
  )

  useEffect(() => {
    if (defaultValue && defaultValue > 0) {
      const raw = String(defaultValue)
      setRawValue(raw)
      setDisplay(formatDisplay(raw))
    }
  }, [defaultValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    setRawValue(digits)
    setDisplay(digits ? formatDisplay(digits) : '')
    onChange?.(digits ? parseInt(digits, 10) : 0)
  }

  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500 pointer-events-none font-medium">
        Rp
      </span>
      {/* Hidden input with raw value for form submission */}
      <input type="hidden" name={name} value={rawValue} />
      {/* Visible formatted input */}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="input pl-10 text-xl font-bold tracking-tight"
        autoComplete="off"
        aria-label="Nominal dalam Rupiah"
      />
    </div>
  )
}
