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
    /* overflow-x-hidden on root prevents any child from causing horizontal scroll */
    <div className="min-h-screen w-full bg-background text-foreground transition-colors duration-300">
      {/* Mobile Navigation */}
      <MobileTopBar notificationCount={notificationCount} />

      <div className="flex w-full">
        {/* Desktop Sidebar */}
        <Sidebar user={user} />

        {/* Main Content
            min-w-0   → flex children don't shrink below content by default; this forces correct sizing
            w-full    → take full remaining width (not wider than parent)
            overflow-x-hidden → belt-and-suspenders clip for any sticky children */}
        <main className="flex-1 min-w-0 w-full overflow-x-hidden min-h-screen pt-14 pb-16 lg:pt-0 lg:pb-0">
          <div className="max-w-2xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  )
}
