'use client'

import { Sidebar } from './Sidebar'
import { MobileTopBar, MobileBottomNav } from './MobileNav'

interface AppLayoutProps {
  children: React.ReactNode
  user?: {
    displayName: string
    avatarUrl?: string
    standing: number
    badge: string
  }
  notificationCount?: number
}

export function AppLayout({ children, user, notificationCount }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Navigation */}
      <MobileTopBar notificationCount={notificationCount} />

      <div className="flex">
        {/* Desktop Sidebar */}
        <Sidebar user={user} />

        {/* Main Content */}
        <main className="flex-1 min-h-screen pt-14 pb-16 lg:pt-0 lg:pb-0">
          <div className="max-w-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  )
}
