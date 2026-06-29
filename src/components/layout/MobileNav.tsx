'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, Search, Plus, Trophy, MessageCircle,
  Bell, User, X, ChevronRight,
  Users, ShoppingBag, BarChart3, Settings, HelpCircle, LogOut,
  FileText, Megaphone,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavUser {
  displayName: string
  avatarUrl?: string
  standing: number
  badge: string
}

interface MobileNavProps {
  user?: NavUser
  notificationCount?: number
}

// ── Drawer navigation items ───────────────────────────────────────────────────

const drawerNavItems = [
  { href: '/profile',     icon: User,        label: 'Profile'     },
  { href: '/community',   icon: Users,       label: 'Circles'     },
  { href: '/exchange',    icon: ShoppingBag, label: 'Exchange'    },
  { href: '/leaderboard', icon: BarChart3,   label: 'Leaderboard' },
  { href: '/settings',    icon: Settings,    label: 'Settings'    },
]

// ── Helper: avatar ring colour by badge ──────────────────────────────────────

function badgeRing(badge?: string) {
  if (badge === 'Gold')    return 'ring-yellow-400'
  if (badge === 'Silver')  return 'ring-slate-400'
  if (badge === 'Bronze')  return 'ring-amber-600'
  return 'ring-gold/40'
}

// ── Profile Drawer (right-side slide) ────────────────────────────────────────

function ProfileDrawer({ user, onClose }: { user?: NavUser; onClose: () => void }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [visible, setVisible] = useState(false)
  const prevPath  = useRef(pathname)

  // Trigger enter animation after first paint
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Close when the route changes (browser back, programmatic push, Link click)
  useEffect(() => {
    if (prevPath.current !== pathname) handleClose()
    prevPath.current = pathname
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    handleClose()
    router.push('/login')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={handleClose}
      />

      {/* Drawer panel — slides from the right */}
      <div
        className={cn(
          'lg:hidden fixed top-0 right-0 bottom-0 z-[70]',
          'w-[82vw] max-w-[320px] bg-white flex flex-col shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          visible ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header — extra top padding for status bar */}
        <div className="flex items-center justify-between px-5 pt-12 pb-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-gold/10 ring-2 flex-shrink-0',
              badgeRing(user?.badge),
            )}>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-gold" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">{user?.displayName ?? 'User'}</p>
              <p className="text-xs text-muted-foreground">
                {(user?.standing ?? 0).toLocaleString()} Standing · {user?.badge ?? 'Citizen'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-muted transition-colors flex-shrink-0 ml-2"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-0.5 px-3">
            {drawerNavItems.map(item => {
              const isActive = pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={handleClose}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors',
                      isActive
                        ? 'bg-gold/10 text-gold font-semibold'
                        : 'text-foreground hover:bg-muted/70',
                    )}
                  >
                    <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-gold' : 'text-muted-foreground')} />
                    <span className="text-sm flex-1">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Divider + secondary items */}
          <div className="mt-4 mx-3 pt-4 border-t border-border space-y-0.5">
            {/* Help & Support — placeholder until /help page exists */}
            <button
              onClick={handleClose}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-foreground hover:bg-muted/70 transition-colors"
            >
              <HelpCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm flex-1 text-left">Help & Support</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium flex-1 text-left">Logout</span>
            </button>
          </div>
        </nav>

        {/* Branding footer */}
        <div className="px-5 py-4 border-t border-border">
          <Image src="/logo-gold.png" alt="IMPHERE" width={90} height={22} className="h-5 w-auto opacity-50" />
        </div>
      </div>
    </>
  )
}

// ── Create Bottom Sheet ───────────────────────────────────────────────────────

function CreateSheet({ onClose }: { onClose: () => void }) {
  const router    = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 260)
  }

  const handleOption = (href: string) => {
    router.push(href)
    handleClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={handleClose}
      />

      {/* Sheet — slides up from bottom */}
      <div
        className={cn(
          'lg:hidden fixed left-0 right-0 bottom-0 z-[70] bg-white rounded-t-3xl shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="px-5 pt-2 pb-3 flex items-center justify-between">
          <h3 className="text-base font-serif font-bold text-foreground">Create</h3>
          <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-4 pb-10 space-y-2">
          {/* Create Post */}
          <button
            onClick={() => handleOption('/create')}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-muted/40 hover:bg-gold/5 border border-transparent hover:border-gold/20 transition-all text-left"
          >
            <div className="w-11 h-11 rounded-2xl bg-gold/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Create Post</p>
              <p className="text-xs text-muted-foreground mt-0.5">Share a civic moment or update</p>
            </div>
          </button>

          {/* Raise Challenge */}
          <button
            onClick={() => handleOption('/create')}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-muted/40 hover:bg-amber-50 border border-transparent hover:border-amber-200/50 transition-all text-left"
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-100/70 flex items-center justify-center flex-shrink-0">
              <Megaphone className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Raise Challenge</p>
              <p className="text-xs text-muted-foreground mt-0.5">Rally the community around a local issue</p>
            </div>
          </button>
        </div>
      </div>
    </>
  )
}

// ── Bottom nav link helper ────────────────────────────────────────────────────

function BottomNavLink({
  href, icon: Icon, label, active,
}: {
  href: string
  icon: React.ElementType
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex-1 flex flex-col items-center justify-end gap-0.5 pb-2 transition-colors',
        active ? 'text-gold' : 'text-muted-foreground',
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] leading-none">{label}</span>
    </Link>
  )
}

// ── Mobile Top Bar ────────────────────────────────────────────────────────────

export function MobileTopBar({ user, notificationCount = 0 }: MobileNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="relative flex items-center justify-between px-4 h-14">

          {/* Left — Profile avatar → opens sidebar drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1 -ml-1 rounded-full"
            aria-label="Open profile menu"
          >
            <div className={cn(
              'w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-gold/10 ring-2',
              badgeRing(user?.badge),
            )}>
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName ?? 'Profile'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-gold" />
              )}
            </div>
          </button>

          {/* Center — Logo, absolutely centred so it's independent of side items */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2" aria-label="IMPHERE Home">
            <Image
              src="/logo-gold.png"
              alt="IMPHERE"
              width={130}
              height={33}
              priority
              className="h-8 w-auto"
            />
          </Link>

          {/* Right — Notifications */}
          <Link
            href="/notifications"
            className="relative p-2 -mr-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-6 h-6 text-foreground" />
            {notificationCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {drawerOpen && (
        <ProfileDrawer user={user} onClose={() => setDrawerOpen(false)} />
      )}
    </>
  )
}

// ── Mobile Bottom Nav ─────────────────────────────────────────────────────────

export function MobileBottomNav() {
  const pathname    = usePathname()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border safe-area-inset-bottom shadow-[0_-1px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-end h-16 px-1">

          {/* Home */}
          <BottomNavLink href="/"          icon={Home}           label="Home"       active={pathname === '/'} />
          {/* Search */}
          <BottomNavLink href="/explore"   icon={Search}         label="Search"     active={pathname.startsWith('/explore')} />

          {/* Create — elevated gold button in the center */}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex-1 flex flex-col items-center justify-end pb-2"
            aria-label="Create"
          >
            <div className="w-12 h-12 rounded-2xl bg-gold shadow-lg shadow-gold/30 flex items-center justify-center -mt-5">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] leading-none text-muted-foreground mt-1">Create</span>
          </button>

          {/* Challenges */}
          <BottomNavLink href="/challenges" icon={Trophy}         label="Challenges" active={pathname.startsWith('/challenges')} />
          {/* Chats → Community circles */}
          <BottomNavLink href="/community"  icon={MessageCircle}  label="Chats"      active={pathname.startsWith('/community')} />
        </div>
      </nav>

      {createOpen && <CreateSheet onClose={() => setCreateOpen(false)} />}
    </>
  )
}
