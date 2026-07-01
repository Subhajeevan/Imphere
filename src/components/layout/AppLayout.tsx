'use client'

import { Sidebar } from './Sidebar'
import { MobileTopBar, MobileBottomNav } from './MobileNav'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
  user?: {
    displayName: string
    avatarUrl?: string
    standing: number
    badge: string
  }
  notificationCount?: number
  /**
   * fullBleed: removes max-w-2xl wrapper and makes main fill the full viewport
   * height. Used for pages like chat that need a fixed header + scrollable body
   * + fixed footer layout.
   */
  fullBleed?: boolean
}

export function AppLayout({ children, user, notificationCount, fullBleed }: AppLayoutProps) {
  return (
    <div className={cn(
      'w-full overflow-x-hidden bg-background text-foreground transition-colors duration-300',
      fullBleed ? 'h-screen overflow-hidden' : 'min-h-screen',
    )}>
      {/* Mobile top bar — fixed, height 56px (h-14) */}
      <MobileTopBar user={user} />

      <div className={cn('flex w-full', fullBleed && 'h-full')}>
        {/* Desktop sidebar */}
        <Sidebar user={user} />

        {/* Main content */}
        <main className={cn(
          'flex-1 min-w-0 w-full overflow-x-hidden',
          fullBleed
            ? 'flex flex-col overflow-hidden pt-14 pb-16 lg:pt-0 lg:pb-0'
            : 'min-h-screen pt-14 pb-16 lg:pt-0 lg:pb-0',
        )}>
          {fullBleed ? (
            children
          ) : (
            <div className="max-w-2xl mx-auto w-full">
              {children}
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom navigation — fixed */}
      <MobileBottomNav notificationCount={notificationCount} />
    </div>
  )
}
