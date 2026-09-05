'use client'

import { PERIOD_OPTIONS, type PeriodKey } from '@/lib/utils/date'

interface PeriodSelectorProps {
  value: PeriodKey
  onChange: (period: PeriodKey) => void
}

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div
      className="flex items-center gap-1.5 p-1 rounded-2xl w-full"
      style={{ backgroundColor: 'rgba(29,106,245,0.08)' }}
      role="group"
      aria-label="Filter periode"
    >
      {PERIOD_OPTIONS.map(option => {
        const active = value === option.key
        return (
          <button
            key={option.key}
            onClick={() => onChange(option.key)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 whitespace-nowrap"
            style={active ? {
              backgroundColor: '#1d6af5',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(29,106,245,0.4)',
            } : {
              color: '#6b7280',
              backgroundColor: 'transparent',
            }}
            aria-pressed={active}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
