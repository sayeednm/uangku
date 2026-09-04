'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import AddActionSheet from './AddActionSheet'

const LEFT_LINKS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    href: '/transaksi',
    label: 'Transaksi',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
]

const RIGHT_LINKS = [
  {
    href: '/laporan',
    label: 'Laporan',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    href: '/lainnya',
    label: 'Lainnya',
    icon: 'M4 6h16M4 12h16M4 18h16',
  },
]

export default function MobileNav() {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href
    if (href === '/transaksi') return pathname === '/transaksi'
    if (href === '/laporan') return pathname.startsWith('/laporan')
    if (href === '/lainnya') {
      return ['/lainnya', '/kategori', '/profil', '/pengaturan', '/transfer', '/rekening']
        .some(p => pathname.startsWith(p))
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-[68px] flex items-stretch
          bg-white/95 dark:bg-[#0A0C14]/95
          backdrop-blur-xl
          border-t border-gray-100 dark:border-white/[0.06]
          transition-colors duration-300"
        aria-label="Navigasi utama"
      >
        {LEFT_LINKS.map(link => {
          const active = isActive(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                active
                  ? 'text-[#1d6af5]'
                  : 'text-gray-400 dark:text-gray-600 hover:text-[#1d6af5]/70'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              {/* Icon container with active indicator */}
              <div className={`relative flex items-center justify-center w-10 h-6 rounded-full transition-all duration-200 ${
                active ? 'bg-[#1d6af5]/10 dark:bg-[#1d6af5]/15' : ''
              }`}>
                <svg
                  className={`transition-all duration-200 ${active ? 'w-[22px] h-[22px]' : 'w-5 h-5'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
              </div>
              <span className={`text-[10px] font-semibold transition-all duration-200 ${
                active ? 'text-[#1d6af5]' : ''
              }`}>
                {link.label}
              </span>
            </Link>
          )
        })}

        {/* Center FAB — biru brand */}
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={() => setSheetOpen(true)}
            className="w-[52px] h-[52px] -mt-6 rounded-full
              bg-[#1d6af5] hover:bg-[#1558d6]
              flex items-center justify-center
              shadow-[0_4px_20px_rgba(29,106,245,0.5)]
              hover:shadow-[0_6px_24px_rgba(29,106,245,0.6)]
              active:scale-95 active:bg-[#1040a8]
              transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
            aria-label="Tambah"
          >
            <svg
              className="w-[22px] h-[22px] text-white transition-transform duration-300"
              style={{ transform: sheetOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {RIGHT_LINKS.map(link => {
          const active = isActive(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                active
                  ? 'text-[#1d6af5]'
                  : 'text-gray-400 dark:text-gray-600 hover:text-[#1d6af5]/70'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <div className={`relative flex items-center justify-center w-10 h-6 rounded-full transition-all duration-200 ${
                active ? 'bg-[#1d6af5]/10 dark:bg-[#1d6af5]/15' : ''
              }`}>
                <svg
                  className={`transition-all duration-200 ${active ? 'w-[22px] h-[22px]' : 'w-5 h-5'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
              </div>
              <span className={`text-[10px] font-semibold transition-all duration-200 ${
                active ? 'text-[#1d6af5]' : ''
              }`}>
                {link.label}
              </span>
            </Link>
          )
        })}
      </nav>

      <AddActionSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}
