'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Home,
  Search,
  Trophy,
  Users,
  User,
  Bell,
  ShoppingBag,
  Settings,
  Plus,
  BarChart3,
  MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/',            icon: Home,          label: 'Home' },
  { href: '/explore',     icon: Search,        label: 'Explore' },
  { href: '/challenges',  icon: Trophy,        label: 'Challenges' },
  { href: '/leaderboard', icon: BarChart3,     label: 'Leaderboard' },
  { href: '/community',   icon: Users,         label: 'Community' },
  { href: '/chats',       icon: MessageCircle, label: 'Chats' },
]

const secondaryItems = [
  { href: '/notifications', icon: Bell,        label: 'Notifications' },
  { href: '/exchange',      icon: ShoppingBag, label: 'Exchange' },
  { href: '/settings',      icon: Settings,    label: 'Settings' },
]

interface SidebarProps {
  user?: {
    displayName: string
    avatarUrl?: string
    standing: number
    badge: string
  }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  /**
   * Active-match logic:
   *   - "/" matches only exactly "/"
   *   - all other routes: startsWith so sub-routes are also highlighted
   */
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    /* sticky + h-screen keeps the sidebar fixed while main content scrolls */
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-border bg-card transition-colors duration-300 overflow-y-auto scrollbar-hide">
      {/* Logo */}
      <div className="p-6 flex-shrink-0">
        <Link href="/" className="block">
          <Image
            src="/logo-gold.png"
            alt="IMPHERE"
            width={180}
            height={45}
            priority
            className="h-10 w-auto"
          />
        </Link>
      </div>

      {/* Primary Navigation — flex-1 so it fills available space */}
      <nav className="flex-1 px-3 min-h-0">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    active
                      ? 'bg-gold/10 text-gold font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Create Post Button */}
        <div className="mt-4 px-2">
          <Link
            href="/create"
            className="flex items-center justify-center gap-2 w-full py-3 px-4
                       bg-gold text-white font-medium rounded-lg
                       hover:bg-gold-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>New Post</span>
          </Link>
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-border" />

        {/* Secondary Navigation */}
        <ul className="space-y-1">
          {secondaryItems.map((item) => {
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    active
                      ? 'bg-gold/10 text-gold font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Profile Card — always at the bottom */}
      <div className="flex-shrink-0 p-4 border-t border-border">
        {user ? (
          <Link
            href="/profile"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <div
              className={cn(
                'w-10 h-10 rounded-full bg-muted flex items-center justify-center',
                'ring-2',
                user.badge === 'Gold'    && 'ring-yellow-400',
                user.badge === 'Silver'  && 'ring-slate-400',
                user.badge === 'Bronze'  && 'ring-amber-600',
                user.badge === 'Citizen' && 'ring-border'
              )}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate text-sm">{user.displayName}</p>
              <p className="text-xs text-muted-foreground">
                {user.standing.toLocaleString()} Standing · {user.badge}
              </p>
            </div>
          </Link>
        ) : (
          /* Skeleton placeholder keeps footer height consistent */
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-muted rounded w-24 animate-pulse" />
              <div className="h-2.5 bg-muted rounded w-16 animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
