'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'
import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton'

/* Static dark theme — immune to theme cache, matches login page */

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { full_name: formData.name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(
          error.message.includes('already registered')
            ? 'An account with this email already exists'
            : error.message
        )
        setIsLoading(false)
        return
      }

      setSuccess(true)
    } catch {
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  // ── Shared input class ──────────────────────────────────────────────────
  const inputCls = `
    w-full px-4 py-3 rounded-lg text-sm
    bg-[#1a1a1a] text-white placeholder-[#666]
    border border-[#333] outline-none
    focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/25
    transition-all duration-200
  `

  // ── Success ─────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
           style={{ backgroundColor: '#0d0d0d' }}>
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
               style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <CheckCircle className="w-10 h-10" style={{ color: '#86efac' }} />
          </div>
          <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: '#f5f5f5' }}>
            Check Your Email
          </h1>
          <p className="text-sm mb-6" style={{ color: '#888' }}>
            We've sent a verification link to{' '}
            <strong style={{ color: '#ccc' }}>{formData.email}</strong>.{' '}
            Click the link to activate your account.
          </p>
          <Link
            href="/login"
            className="inline-block py-3 px-8 rounded-lg font-medium text-sm transition-all duration-200"
            style={{ background: '#D4AF37', color: '#0d0d0d' }}
          >
            Back to Login
          </Link>
          <p className="mt-4 text-xs" style={{ color: '#555' }}>
            Didn't receive the email? Check your spam folder.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0d0d0d', color: '#f5f5f5' }}>

      {/* ── Left branding panel (desktop) ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative"
           style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #111 50%, #0a0a0a 100%)' }}>
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
          <div className="mt-10 flex flex-col gap-3 text-left max-w-xs mx-auto">
            {[
              { icon: '🏙️', text: 'Join a growing civic community' },
              { icon: '🌟', text: 'Build your Standing through action' },
              { icon: '📣', text: 'Raise Proclamations for local issues' },
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
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-8 overflow-y-auto"
           style={{ backgroundColor: '#111' }}>
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <Image src="/logo-gold.png" alt="IMPHERE" width={180} height={45} priority className="mx-auto mb-2" />
          <p className="text-sm font-serif" style={{ color: '#888' }}>Build Your Standing</p>
        </div>

        <div className="w-full max-w-[400px]">
          <div className="mb-6">
            <h2 className="text-2xl font-serif font-semibold" style={{ color: '#f5f5f5' }}>Create Account</h2>
            <p className="mt-1 text-sm" style={{ color: '#888' }}>Join the civic movement today</p>
          </div>

          {/* Error */}
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
            <span className="text-xs" style={{ color: '#555' }}>or sign up with email</span>
            <div className="flex-1 h-px" style={{ background: '#2a2a2a' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#ccc' }}>Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
                className={inputCls}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#ccc' }}>Email Address</label>
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
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#ccc' }}>Password</label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#555' }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-1 text-xs" style={{ color: '#555' }}>At least 6 characters</p>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#ccc' }}>Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                required
                className={inputCls}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 mt-2 transition-all duration-200 disabled:opacity-50"
              style={{ background: '#D4AF37', color: '#0d0d0d' }}
              onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = '#c9a227' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#D4AF37' }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Creating account…
                </>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: '#666' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-medium hover:underline" style={{ color: '#D4AF37' }}>
              Sign in
            </Link>
          </p>

          <p className="mt-5 text-center text-xs" style={{ color: '#444' }}>
            By creating an account, you agree to our{' '}
            <a href="#" className="hover:underline" style={{ color: '#D4AF37' }}>Terms</a>
            {' '}and{' '}
            <a href="#" className="hover:underline" style={{ color: '#D4AF37' }}>Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
