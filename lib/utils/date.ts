/**
 * Date utilities for Uangku dashboard period filtering
 */

export type PeriodKey = 'today' | 'this_week' | 'this_month' | 'this_year'

export interface PeriodRange {
  start: string // ISO date string YYYY-MM-DD
  end: string   // ISO date string YYYY-MM-DD
  label: string
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'today',      label: 'Hari ini' },
  { key: 'this_week',  label: 'Minggu ini' },
  { key: 'this_month', label: 'Bulan ini' },
  { key: 'this_year',  label: 'Tahun ini' },
]

/**
 * Get date range for a given period key.
 * Uses local date logic — no timezone-sensitive server calls.
 */
export function getPeriodRange(period: PeriodKey): PeriodRange {
  const now = new Date()
  // Use local date formatting to avoid UTC timezone shift
  const toISO = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  let start: Date
  let end: Date

  switch (period) {
    case 'today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      end   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    }
    case 'this_week': {
      const day = now.getDay() // 0 = Sunday
      const diff = day === 0 ? -6 : 1 - day // Monday as start
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff)
      end   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    }
    case 'this_month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    }
    case 'this_year': {
      start = new Date(now.getFullYear(), 0, 1)
      end   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    }
  }

  return {
    start: toISO(start),
    end:   toISO(end),
    label: PERIOD_OPTIONS.find(p => p.key === period)?.label ?? '',
  }
}

/**
 * Format a date string (YYYY-MM-DD or ISO) for display.
 * Example: "01 Sep 2026"
 */
export function formatDate(dateStr: string): string {
  // Parse YYYY-MM-DD manually to avoid UTC conversion
  const [year, month, day] = dateStr.substring(0, 10).split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('id-ID', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}

/**
 * Get current month/year label in Indonesian.
 * Example: "September 2026"
 */
export function getCurrentMonthLabel(): string {
  return new Date().toLocaleDateString('id-ID', {
    month: 'long',
    year:  'numeric',
  })
}
