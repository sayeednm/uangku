'use client'

import Image from 'next/image'
import ThemeToggle from './ThemeToggle'

export default function MobileHeader() {
  return (
    <header className="lg:hidden sticky top-0 z-20 h-14 flex items-center justify-between px-5
      bg-white/95 dark:bg-[#0A0C14]/95
      backdrop-blur-xl
      border-b border-gray-200/50 dark:border-white/[0.06]
      transition-colors duration-300">
      <div className="flex items-center gap-2">
        <Image src="/logo.png" alt="Uangku" width={28} height={28} className="rounded-lg" />
        <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
          Uangku
        </span>
      </div>
      <ThemeToggle />
    </header>
  )
}
