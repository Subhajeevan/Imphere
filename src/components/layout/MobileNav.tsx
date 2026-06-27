'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Home, Search, Trophy, ShoppingBag, User, Bell, Plus, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const bottomNavItems = [
  { href: '/',            icon: Home,        label: 'Home'       },
  { href: '/explore',     icon: Search,      label: 'Explore'    },
  { href: '/challenges',  icon: Trophy,      label: 'Challenges' },
  { href: '/exchange',    icon: ShoppingBag, label: 'Exchange'   },
  { href: '/leaderboard', icon: BarChart3,   label: 'Leaders'    },
  { href: '/profile',     icon: User,        label: 'Profile'    },
]

interface MobileNavProps {
  notificationCount?: number
}

export function MobileTopBar({ notificationCount = 0 }: MobileNavProps) {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border transition-colors duration-300">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <Link href="/">
          <Image
            src="/logo-gold.png"
            alt="IMPHERE"
            width={140}
            height={35}
            priority
            className="h-8 w-auto"
          />
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/create"
            className="p-2 rounded-full bg-gold text-white hover:bg-gold-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
          </Link>
          <Link href="/notifications" className="relative p-2">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-inset-bottom transition-colors duration-300">
      <div className="flex items-center justify-around h-16">
        {bottomNavItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2',
                'transition-colors',
                isActive ? 'text-gold' : 'text-muted-foreground'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] leading-none">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
