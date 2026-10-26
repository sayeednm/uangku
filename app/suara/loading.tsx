// Full-screen client page — skeleton mirrors SuaraClient's layout (header + state card)
export default function SuaraLoading() {
  return (
    <div className="min-h-screen bg-[#F0F4FF] dark:bg-[#0A0C14]" aria-busy="true">
      <header className="flex items-center gap-3 px-4 h-14 border-b
        bg-white/95 dark:bg-[#0A0C14]/95 border-gray-200/50 dark:border-white/[0.06]">
        <div className="skeleton w-4 h-4 rounded" aria-hidden="true" />
        <div className="skeleton h-4 w-28" aria-hidden="true" />
      </header>
      <main className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        <div className="rounded-3xl bg-white dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.08] px-6 py-8 shadow-sm flex flex-col items-center gap-4">
          <div className="skeleton w-14 h-14 rounded-full" aria-hidden="true" />
          <div className="skeleton h-4 w-44" aria-hidden="true" />
          <div className="skeleton h-3 w-56" aria-hidden="true" />
        </div>
        <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.08] p-4 flex gap-2">
          <div className="skeleton h-10 flex-1 rounded-lg" aria-hidden="true" />
          <div className="skeleton h-10 w-24 rounded-lg" aria-hidden="true" />
        </div>
      </main>
    </div>
  )
}
