import { ReactNode } from 'react'
import AppSidebar from './AppSidebar'
import MobileNav from './MobileNav'
import MobileHeader from './MobileHeader'
import InstallBanner from '@/components/pwa/InstallBanner'

interface AppLayoutProps {
  children: ReactNode
  userEmail: string
}

export default function AppLayout({ children, userEmail }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F0F4FF] dark:bg-[#0A0C14] transition-colors duration-300">
      {/* Desktop sidebar */}
      <AppSidebar userEmail={userEmail} />

      {/* Mobile top header */}
      <MobileHeader />

      {/* Main content */}
      <main className="lg:pl-60">
        <div className="max-w-2xl mx-auto px-4 sm:px-5 py-5 pb-28 lg:pb-12 page-enter">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* PWA install banner — mobile only */}
      <InstallBanner />
    </div>
  )
}
