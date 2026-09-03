import { formatCurrency } from '@/lib/utils/currency'
import EmptyState from './EmptyState'
import type { CategorySpendingRow } from '@/lib/dashboard/queries'

interface CategorySpendingProps {
  data: CategorySpendingRow[]
  periodLabel: string
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
                {/* Progress bar */}
                <div className="h-1 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-800 dark:bg-gray-300 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
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
