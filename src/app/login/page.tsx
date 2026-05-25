'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton'

/* ─────────────────────────────────────────────────────────────
   LOGIN PAGE — intentionally hard-coded dark theme.
   We do NOT use Tailwind semantic tokens (bg-background etc.)
   here because this page is seen before any theme preference
   has been applied, and we want a consistent branded look.
───────────────────────────────────────────────────────────── */

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })

  const message = searchParams.get('message')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please verify your email before logging in')
        } else {
          setError(error.message)
        }
        setIsLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_status')
          .eq('id', user.id)
          .single()

        router.push(profile?.onboarding_status === 'incomplete' ? '/onboarding' : '/')
        router.refresh()
      }
    } catch {
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  // ── Shared input class (always dark-themed) ──
  const inputCls = `
    w-full px-4 py-3 rounded-lg text-sm
    bg-[#1a1a1a] text-white placeholder-[#666]
    border border-[#333] outline-none
    focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/25
    transition-all duration-200
    autofill:bg-[#1a1a1a] autofill:text-white
  `

  return (
    /* Force dark background regardless of theme */
    <div className="min-h-screen flex" style={{ backgroundColor: '#0d0d0d', color: '#f5f5f5' }}>

      {/* ── Left branding panel (desktop) ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative"
           style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #111 50%, #0a0a0a 100%)' }}>
        {/* Subtle gold ring decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
               style={{ border: '1px solid rgba(212,175,55,0.08)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full"
               style={{ border: '1px solid rgba(212,175,55,0.12)' }} />
        </div>

        <div className="text-center relative z-10">
          <Image src="/logomark.png" alt="IMPHERE" width={112} height={112} priority className="mx-auto mb-8 drop-shadow-2xl" />
          <h1 className="text-5xl font-serif font-bold mb-4" style={{ color: '#D4AF37' }}>IMPHERE</h1>
          <p className="text-xl font-serif" style={{ color: '#aaa' }}>Build Your Standing. Resolve the Future.</p>

          {/* Feature pills */}
          <div className="mt-10 flex flex-col gap-3 text-left max-w-xs mx-auto">
            {[
              { icon: '🏆', text: 'Earn Standing Points' },
              { icon: '🌍', text: 'Civic Challenges & Rewards' },
              { icon: '🤝', text: 'Community-driven Impact' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 px-4 py-2 rounded-xl"
                   style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}>
                <span className="text-xl">{icon}</span>
                <span className="text-sm" style={{ color: '#ccc' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="absolute bottom-8 text-xs" style={{ color: '#444' }}>
          A civic initiative for community empowerment
        </p>
      </div>

      {/* ── Right form panel ───────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-8"
           style={{ backgroundColor: '#111' }}>

        {/* Mobile logo */}
        <div className="lg:hidden mb-10 text-center">
          <Image src="/logo-gold.png" alt="IMPHERE" width={180} height={45} priority className="mx-auto mb-2" />
          <p className="text-sm font-serif" style={{ color: '#888' }}>Build Your Standing</p>
        </div>

        <div className="w-full max-w-[400px]">

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-serif font-semibold" style={{ color: '#f5f5f5' }}>Welcome Back</h2>
            <p className="mt-1 text-sm" style={{ color: '#888' }}>Sign in to continue your civic journey</p>
          </div>

          {/* Success message */}
          {message && (
            <div className="mb-5 p-3.5 rounded-lg text-sm"
                 style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac' }}>
              {message}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-5 p-3.5 rounded-lg text-sm"
                 style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <div className="mb-1">
            <GoogleOAuthButton label="Continue with Google" dark />
          </div>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: '#2a2a2a' }} />
            <span className="text-xs" style={{ color: '#555' }}>or sign in with email</span>
            <div className="flex-1 h-px" style={{ background: '#2a2a2a' }} />
          </div>

          {/* Email / password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#ccc' }}>
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                required
                className={inputCls}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#ccc' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className={inputCls + ' pr-11'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#555' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#D4AF37')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="text-right mt-1.5">
                <Link href="/forgot-password" className="text-xs hover:underline" style={{ color: '#D4AF37' }}>
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 mt-2 transition-all duration-200 disabled:opacity-50"
              style={{ background: '#D4AF37', color: '#0d0d0d' }}
              onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = '#c9a227' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#D4AF37' }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Sign up link */}
          <p className="mt-6 text-center text-sm" style={{ color: '#666' }}>
            Don't have an account?{' '}
            <Link href="/signup" className="font-medium hover:underline" style={{ color: '#D4AF37' }}>
              Create one
            </Link>
          </p>

          {/* Terms */}
          <p className="mt-6 text-center text-xs" style={{ color: '#444' }}>
            By continuing, you agree to our{' '}
            <a href="#" className="hover:underline" style={{ color: '#D4AF37' }}>Terms</a>
            {' '}and{' '}
            <a href="#" className="hover:underline" style={{ color: '#D4AF37' }}>Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0d0d0d' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
