'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, User, CheckCircle } from 'lucide-react'

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

    // Validation
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
          data: {
            full_name: formData.name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        if (error.message.includes('already registered')) {
          setError('An account with this email already exists')
        } else {
          setError(error.message)
        }
        setIsLoading(false)
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground mb-2">
            Check Your Email
          </h1>
          <p className="text-muted-foreground mb-6">
            We've sent a verification link to <strong>{formData.email}</strong>.
            Click the link to activate your account.
          </p>
          <Link
            href="/login"
            className="inline-block py-3 px-6 bg-gold text-white font-medium rounded-lg
                       hover:bg-gold-dark transition-colors"
          >
            Back to Login
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            Didn't receive the email? Check your spam folder.
          </p>
        </div>
      </div>
    )
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
        <div className="lg:hidden mb-8 text-center">
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
              Create Account
            </h2>
            <p className="text-muted-foreground">
              Join the civic movement today
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-lg
                             focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none
                             transition-all"
                />
              </div>
            </div>

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
              <p className="mt-1 text-xs text-muted-foreground">
                At least 6 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-lg
                             focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none
                             transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gold text-white font-medium rounded-lg
                         hover:bg-gold-dark transition-colors duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2 mt-6"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-border"></div>
            <span className="px-4 text-sm text-muted-foreground">or</span>
            <div className="flex-1 border-t border-border"></div>
          </div>

          {/* Login Link */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-gold font-medium hover:underline">
              Sign in
            </Link>
          </p>

          {/* Terms */}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            By creating an account, you agree to our{' '}
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
