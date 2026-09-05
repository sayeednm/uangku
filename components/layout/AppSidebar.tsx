'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_LINKS, SECONDARY_LINKS } from './NavLinks'
import ThemeToggle from './ThemeToggle'
import Image from 'next/image'

interface AppSidebarProps {
  userEmail: string
}

function NavIcon({ path }: { path: string }) {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor"
      viewBox="0 0 24 24" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

function getInitial(email: string) {
  return email.charAt(0).toUpperCase()
}

export default function AppSidebar({ userEmail }: AppSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  const linkClass = (active: boolean) =>
    `nav-link ${active ? 'nav-link-active' : 'nav-link-inactive'}`

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen fixed top-0 left-0 z-30
      bg-white dark:bg-[#0D1117]
      border-r border-gray-200/60 dark:border-white/[0.06]
      transition-colors duration-300">

      {/* Brand */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200/60 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Uangku" width={32} height={32} className="rounded-xl" />
          <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
            Uangku
          </span>
        </div>
        <ThemeToggle />
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Navigasi utama">
        {NAV_LINKS.map(link => {
          const active = isActive(link.href)
          return (
            <Link key={link.href} href={link.href}
              prefetch={true}
              className={linkClass(active)}
              aria-current={active ? 'page' : undefined}
            >
              <span className={active ? '' : 'opacity-60'}>
                <NavIcon path={link.icon} />
              </span>
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Secondary + user */}
      <div className="px-3 py-4 border-t border-gray-200/60 dark:border-white/[0.06] space-y-0.5">
        {SECONDARY_LINKS.map(link => {
          const active = isActive(link.href)
          return (
            <Link key={link.href} href={link.href}
              prefetch={true}
              className={linkClass(active)}
              aria-current={active ? 'page' : undefined}
            >
              <span className={active ? '' : 'opacity-60'}>
                <NavIcon path={link.icon} />
              </span>
              {link.label}
            </Link>
          )
        })}

        {/* User */}
        <div className="mt-2 pt-3 border-t border-gray-200/60 dark:border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[#1d6af5] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {getInitial(userEmail)}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate flex-1">{userEmail}</p>
          </div>

          <form action="/auth/logout" method="post" className="mt-0.5">
            <button type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400
                hover:bg-gray-900/[0.06] dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-gray-100
                transition-all duration-150">
              <svg className="w-4 h-4 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Keluar
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
