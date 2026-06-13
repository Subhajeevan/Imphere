'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProfilePhotoUpload } from '@/components/ui/ImageUpload'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  User,
  Lock,
  LogOut,
  Trash2,
  ChevronRight,
  AlertTriangle,
  Palette,
  Sun,
  Moon,
  Laptop,
  Check,
} from 'lucide-react'

interface SettingsPageProps {
  user?: {
    displayName: string
    avatarUrl?: string
    standing: number
    badge: string
  }
  profile: {
    displayName: string
    bio: string
    avatarUrl?: string
  }
  email: string
}

export function SettingsPage({ user, profile: initialProfile, email }: SettingsPageProps) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [profile, setProfile] = useState(initialProfile)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('hs_theme') as 'light' | 'dark' | 'auto'
      if (savedTheme) {
        setTheme(savedTheme)
      }
    }
  }, [])

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('hs_theme', newTheme)
      const html = document.documentElement
      const isDark =
        newTheme === 'dark' ||
        (newTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

      if (isDark) {
        html.classList.add('dark')
        html.classList.remove('light')
      } else {
        html.classList.remove('dark')
        html.classList.add('light')
      }
    }
  }

  const handleProfileUpdate = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: profile.displayName,
          bio: profile.bio,
          avatarUrl: profile.avatarUrl,
        }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully' })
        router.refresh()
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = (result: { publicId: string; secureUrl: string }) => {
    setProfile((p) => ({ ...p, avatarUrl: result.secureUrl }))
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menuItems = [
    {
      id: 'profile',
      icon: User,
      label: 'Edit Profile',
      description: 'Change your name, bio, and photo',
    },
    {
      id: 'theme',
      icon: Palette,
      label: 'Theme Customization',
      description: 'Choose between Light, Dark, or System mode',
    },
    {
      id: 'password',
      icon: Lock,
      label: 'Change Password',
      description: 'Update your account password',
    },
  ]

  return (
    <AppLayout user={user}>
      {/* Header */}
      {/* <div className="sticky top-14 lg:top-0 z-40 w-full bg-background border-b border-border px-4 py-4 transition-colors duration-300">
        <h1 className="text-xl font-serif font-bold text-foreground">
          Settings
        </h1>
      </div> */}

      {/* Mobile Menu / Desktop Sidebar Content */}
      {!activeSection && (
        <div className="p-4">
          {/* Menu Items */}
          <div className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className="w-full flex items-center gap-3 p-4 border border-border rounded-lg
                           hover:border-gold/50 hover:bg-gold/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>

          {/* Account Section */}
          <div className="mt-8 pt-6 border-t border-border space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider px-4 mb-3">
              Account
            </p>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 p-4 border border-border rounded-lg
                         hover:border-red-200 hover:bg-red-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-red-600">Sign Out</p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Section */}
      {activeSection === 'profile' && (
        <div className="p-4">
          <button
            onClick={() => setActiveSection(null)}
            className="text-gold hover:underline text-sm mb-4"
          >
            ← Back to Settings
          </button>

          <h2 className="text-lg font-medium text-foreground mb-4">
            Edit Profile
          </h2>

          {/* Message */}
          {message && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <ProfilePhotoUpload
              currentImageUrl={profile.avatarUrl}
              onUpload={handleAvatarUpload}
              size="lg"
            />
          </div>

          {/* Display Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={profile.displayName}
              onChange={(e) =>
                setProfile((p) => ({ ...p, displayName: e.target.value }))
              }
              className="w-full px-4 py-3 bg-card text-foreground border border-border rounded-lg
                         focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-colors duration-200"
            />
          </div>

          {/* Bio */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Bio
            </label>
            <textarea
              value={profile.bio}
              onChange={(e) =>
                setProfile((p) => ({ ...p, bio: e.target.value }))
              }
              rows={3}
              maxLength={160}
              className="w-full px-4 py-3 bg-card text-foreground border border-border rounded-lg
                         focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none
                         resize-none transition-colors duration-200"
              placeholder="Tell us about yourself..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              {profile.bio.length}/160 characters
            </p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleProfileUpdate}
            disabled={isSaving}
            className="w-full py-3 bg-gold text-white font-medium rounded-lg
                       hover:bg-gold-dark transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      )}

      {/* Theme Customization Section */}
      {activeSection === 'theme' && (
        <div className="p-4">
          <button
            onClick={() => setActiveSection(null)}
            className="text-gold hover:underline text-sm mb-4 block"
          >
            ← Back to Settings
          </button>

          <h2 className="text-lg font-serif font-bold text-foreground mb-1">
            Theme Customization
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Personalize your IMPHERE interface. Choose between our light, dark, or system matching theme designs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Light Mode Option */}
            <button
              onClick={() => handleThemeChange('light')}
              className={cn(
                "relative flex flex-col items-center justify-between p-5 border rounded-xl transition-all duration-300 text-center outline-none group bg-card",
                theme === 'light'
                  ? "border-gold ring-2 ring-gold/20 shadow-md scale-[1.02]"
                  : "border-border hover:border-gold/50 hover:bg-gold/5"
              )}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-yellow-100 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-500 mb-4 transition-transform group-hover:scale-110">
                <Sun className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Light Mode</h3>
              {/* <p className="text-xs text-muted-foreground leading-relaxed">
                Crisp background with elegant high contrast typography and gold cues.
              </p> */}
              {theme === 'light' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-gold flex items-center justify-center text-white">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </button>

            {/* Dark Mode Option */}
            <button
              onClick={() => handleThemeChange('dark')}
              className={cn(
                "relative flex flex-col items-center justify-between p-5 border rounded-xl transition-all duration-300 text-center outline-none group bg-card",
                theme === 'dark'
                  ? "border-gold ring-2 ring-gold/20 shadow-md scale-[1.02]"
                  : "border-border hover:border-gold/50 hover:bg-gold/5"
              )}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 mb-4 transition-transform group-hover:scale-110">
                <Moon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Dark Mode</h3>
              {/* <p className="text-xs text-muted-foreground leading-relaxed">
                Soothing dark palettes optimized for low-light civic engagement.
              </p> */}
              {theme === 'dark' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-gold flex items-center justify-center text-white">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </button>

            {/* Auto (System) Option */}
            <button
              onClick={() => handleThemeChange('auto')}
              className={cn(
                "relative flex flex-col items-center justify-between p-5 border rounded-xl transition-all duration-300 text-center outline-none group bg-card",
                theme === 'auto'
                  ? "border-gold ring-2 ring-gold/20 shadow-md scale-[1.02]"
                  : "border-border hover:border-gold/50 hover:bg-gold/5"
              )}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 mb-4 transition-transform group-hover:scale-110">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">System Mode</h3>
              {/* <p className="text-xs text-muted-foreground leading-relaxed">
                Automatically matches your device's operating system preferences.
              </p> */}
              {theme === 'auto' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-gold flex items-center justify-center text-white">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Change Password Section */}
      {activeSection === 'password' && (
        <div className="p-4">
          <button
            onClick={() => setActiveSection(null)}
            className="text-gold hover:underline text-sm mb-4"
          >
            ← Back to Settings
          </button>

          <h2 className="text-lg font-medium text-foreground mb-4">
            Change Password
          </h2>

          <PasswordChangeForm />
        </div>
      )}
    </AppLayout>
  )
}

function PasswordChangeForm() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (formData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    setIsSaving(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword,
      })

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Password updated successfully' })
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          New Password
        </label>
        <input
          type="password"
          value={formData.newPassword}
          onChange={(e) =>
            setFormData((f) => ({ ...f, newPassword: e.target.value }))
          }
          required
          minLength={6}
          className="w-full px-4 py-3 bg-card text-foreground border border-border rounded-lg
                     focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-colors duration-200"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Confirm New Password
        </label>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) =>
            setFormData((f) => ({ ...f, confirmPassword: e.target.value }))
          }
          required
          className="w-full px-4 py-3 bg-card text-foreground border border-border rounded-lg
                     focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-colors duration-200"
        />
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="w-full py-3 bg-gold text-white font-medium rounded-lg
                   hover:bg-gold-dark transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2"
      >
        {isSaving ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Updating...
          </>
        ) : (
          'Update Password'
        )}
      </button>
    </form>
  )
}
