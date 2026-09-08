'use client'

import { formatCurrency } from '@/lib/utils/currency'

interface DonutSegment {
  label: string
  value: number
  color: string
  icon: string | null
}

interface DonutChartProps {
  segments: DonutSegment[]
  total: number
  centerLabel?: string
}

const SIZE = 180
const STROKE = 28
const R = (SIZE - STROKE) / 2
const C = SIZE / 2
const CIRCUMFERENCE = 2 * Math.PI * R

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export default function DonutChart({ segments, total, centerLabel }: DonutChartProps) {
  if (total === 0 || segments.length === 0) {
    return (
      <div className="flex flex-col items-center py-6">
        <div
          className="relative flex items-center justify-center"
          style={{ width: SIZE, height: SIZE }}
        >
          <svg width={SIZE} height={SIZE}>
            <circle
              cx={C} cy={C} r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              className="text-gray-100 dark:text-white/[0.05]"
            />
          </svg>
          <div className="absolute text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">Belum ada data</p>
          </div>
        </div>
      </div>
    )
  }

  // Build segments
  let cumulative = 0
  const arcs = segments.map(seg => {
    const pct = seg.value / total
    const dash = pct * CIRCUMFERENCE
    const gap = CIRCUMFERENCE - dash
    const rotation = cumulative * 360 - 90
    cumulative += pct
    return { ...seg, pct, dash, gap, rotation }
  })

  return (
    <div className="flex flex-col items-center">
      {/* Donut */}
      <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(0deg)' }}>
          {/* Background track */}
          <circle
            cx={C} cy={C} r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            className="text-gray-100 dark:text-white/[0.04]"
          />
          {/* Segments */}
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx={C} cy={C} r={R}
              fill="none"
              stroke={arc.color}
              strokeWidth={STROKE}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              style={{
                transform: `rotate(${arc.rotation}deg)`,
                transformOrigin: `${C}px ${C}px`,
                transition: 'stroke-dasharray 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                filter: `drop-shadow(0 2px 4px ${arc.color}50)`,
              }}
            />
          ))}
        </svg>

        {/* Center content */}
        <div className="absolute text-center pointer-events-none">
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-0.5">
            {centerLabel ?? 'Total'}
          </p>
          <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums leading-tight">
            {formatCurrency(total)}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full mt-4 space-y-2.5 px-2">
        {arcs.map((arc, i) => (
          <div key={i} className="flex items-center gap-2.5">
            {/* Color dot */}
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: arc.color }}
            />
            {/* Icon + label */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {arc.icon && <span className="text-sm leading-none">{arc.icon}</span>}
              <span className="text-[13px] text-gray-700 dark:text-gray-300 truncate">
                {arc.label}
              </span>
            </div>
            {/* Percentage */}
            <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 flex-shrink-0">
              {Math.round(arc.pct * 100)}%
            </span>
            {/* Amount */}
            <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 tabular-nums flex-shrink-0 w-24 text-right">
              {formatCurrency(arc.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
