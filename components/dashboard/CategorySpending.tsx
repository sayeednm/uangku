import { formatCurrency } from '@/lib/utils/currency'
import EmptyState from './EmptyState'
import type { CategorySpendingRow } from '@/lib/dashboard/queries'

interface CategorySpendingProps {
  data: CategorySpendingRow[]
  periodLabel: string
}

// Default colors per category name jika tidak ada color dari DB
const CATEGORY_COLORS: Record<string, string> = {
  'Makanan':       '#ef4444',
  'Transportasi':  '#3b82f6',
  'Belanja':       '#8b5cf6',
  'Tagihan':       '#f59e0b',
  'Rumah':         '#10b981',
  'Kesehatan':     '#ec4899',
  'Hiburan':       '#6366f1',
  'Pendidikan':    '#14b8a6',
  'Pakaian':       '#f97316',
  'Keluarga':      '#a855f7',
  'Gaji':          '#10b981',
  'Freelance':     '#3b82f6',
  'Bonus':         '#f59e0b',
  'Investasi':     '#8b5cf6',
  'Hadiah':        '#ec4899',
  'Lainnya':       '#6b7280',
}

function getBarColor(row: CategorySpendingRow): string {
  // Pakai warna dari DB jika ada
  if (row.category_color) return row.category_color
  // Fallback ke mapping nama
  return CATEGORY_COLORS[row.category_name] ?? '#1d6af5'
}

export default function CategorySpending({ data, periodLabel }: CategorySpendingProps) {
  const total = data.reduce((sum, row) => sum + row.total, 0)

  return (
    <section aria-labelledby="cat-spending-heading" className="animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <h2
          id="cat-spending-heading"
          className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest"
        >
          Pengeluaran per Kategori
        </h2>
        <span className="text-[11px] text-gray-400 dark:text-gray-600">{periodLabel}</span>
      </div>

      {data.length === 0 ? (
        <EmptyState
          title="Belum ada pengeluaran"
          description="Pengeluaran berdasarkan kategori akan muncul di sini."
        />
      ) : (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.07] rounded-2xl px-4 py-4 space-y-4">
          {data.map(row => {
            const pct = total > 0 ? Math.round((row.total / total) * 100) : 0
            const barColor = getBarColor(row)

            return (
              <div key={row.category_id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{row.category_icon ?? '📦'}</span>
                    <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                      {row.category_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">{pct}%</span>
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                      {formatCurrency(row.total)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, #1d6af5, #3b82f6)',
                      boxShadow: '0 0 6px rgba(29,106,245,0.4)',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
