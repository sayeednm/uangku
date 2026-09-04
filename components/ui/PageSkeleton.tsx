// Generic page skeleton untuk halaman yang belum punya custom loading

function Bone({ className }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className ?? ''}`} aria-hidden="true" />
}

export default function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" aria-busy="true">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Bone className="h-7 w-36" />
          <Bone className="h-4 w-48" />
        </div>
        <Bone className="h-10 w-24 rounded-xl" />
      </div>

      {/* Content rows */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.07] rounded-2xl p-4 flex items-center gap-3">
            <Bone className="w-10 h-10 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Bone className="h-4 w-32" />
              <Bone className="h-3 w-24" />
            </div>
            <Bone className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
