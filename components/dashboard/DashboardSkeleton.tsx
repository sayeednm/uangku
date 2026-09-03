function Bone({ className }: { className?: string }) {
  return (
    <div className={`skeleton rounded-xl ${className ?? ''}`} aria-hidden="true" />
  )
}

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" aria-busy="true" aria-label="Memuat data...">
      {/* Balance hero */}
      <div className="rounded-2xl bg-gray-200 dark:bg-white/[0.06] p-6">
        <Bone className="h-3 w-20 mb-3 bg-gray-300 dark:bg-white/10" />
        <Bone className="h-10 w-44 bg-gray-300 dark:bg-white/10" />
        <Bone className="h-6 w-28 mt-3 bg-gray-300 dark:bg-white/10" />
      </div>

      {/* Income / Expense */}
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map(i => (
          <div key={i} className="rounded-2xl bg-white dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.07] p-4">
            <Bone className="h-6 w-6 rounded-lg mb-2" />
            <Bone className="h-3 w-16 mb-2" />
            <Bone className="h-6 w-24" />
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div>
        <Bone className="h-3 w-28 mb-3" />
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.07] rounded-2xl px-4 divide-y divide-gray-100 dark:divide-white/[0.05]">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-3 py-3.5">
              <Bone className="w-10 h-10 rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Bone className="h-3 w-32" />
                <Bone className="h-2.5 w-24" />
              </div>
              <Bone className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
