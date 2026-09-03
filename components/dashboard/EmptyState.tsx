import Link from 'next/link'

interface EmptyStateProps {
  title: string
  description: string
  action?: { label: string; href: string }
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[240px] mx-auto leading-relaxed">
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className="inline-block mt-4 text-xs font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-white/20 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
