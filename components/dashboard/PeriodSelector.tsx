'use client'

import { PERIOD_OPTIONS, type PeriodKey } from '@/lib/utils/date'

interface PeriodSelectorProps {
  value: PeriodKey
  onChange: (period: PeriodKey) => void
}

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-blue-50 dark:bg-[#1d6af5]/10 rounded-xl p-1"
      role="group"
      aria-label="Filter periode"
    >
      {PERIOD_OPTIONS.map(option => (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          className={`
            px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all duration-200
            ${value === option.key
              ? 'bg-[#1d6af5] text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-[#1d6af5] dark:hover:text-[#60a5fa]'
            }
          `}
          aria-pressed={value === option.key}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
