import { ReactNode } from 'react'

export default function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.08] rounded-2xl p-7 shadow-sm">
      {children}
    </div>
  )
}
