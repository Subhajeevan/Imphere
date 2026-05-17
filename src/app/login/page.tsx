'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  // Check for messages from other pages
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

      // Check onboarding status
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_status')
          .eq('id', user.id)
          .single()

        if (profile?.onboarding_status === 'incomplete') {
          router.push('/onboarding')
        } else {
          router.push('/')
        }
        router.refresh()
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-900 flex-col items-center justify-center p-12 relative">
        <div className="text-center">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/logomark.png"
              alt="IMPHERE"
              width={128}
              height={128}
              priority
              className="mx-auto"
            />
          </div>

          {/* Wordmark */}
          <h1 className="text-5xl font-serif font-bold text-gold mb-4">
            IMPHERE
          </h1>

          {/* Tagline */}
          <p className="text-xl text-neutral-300 font-serif">
            Build Your Standing. Resolve the Future.
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-8 left-8 text-neutral-600 text-sm">
          A civic initiative for community empowerment
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 bg-white">
        {/* Mobile Logo */}
        <div className="lg:hidden mb-12 text-center">
          <Image
            src="/logo-gold.png"
            alt="IMPHERE"
            width={200}
            height={50}
            priority
            className="mx-auto mb-2"
          />
          <p className="text-muted-foreground font-serif">
            Build Your Standing
          </p>
        </div>

        {/* Auth Card */}
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">
              Welcome Back
            </h2>
            <p className="text-muted-foreground">
              Sign in to continue your civic journey
            </p>
          </div>

          {/* Success Message */}
          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {message}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-lg
                             focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none
                             transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-12 py-3 border border-border rounded-lg
                             focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none
                             transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-gold hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gold text-white font-medium rounded-lg
                         hover:bg-gold-dark transition-colors duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-border"></div>
            <span className="px-4 text-sm text-muted-foreground">or</span>
            <div className="flex-1 border-t border-border"></div>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/signup" className="text-gold font-medium hover:underline">
              Create one
            </Link>
          </p>

          {/* Terms */}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <a href="#" className="text-gold hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-gold hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
