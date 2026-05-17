'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })

  // Check if user has a valid session from the reset link
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        // No session means the link is invalid or expired
        setError('This password reset link is invalid or has expired. Please request a new one.')
      }
    }
    checkSession()
  }, [])

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

      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      })

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      setSuccess(true)

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login?message=Password reset successful. Please sign in.')
      }, 2000)
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
            Password Reset!
          </h1>
          <p className="text-muted-foreground mb-6">
            Your password has been successfully reset.
            Redirecting to login...
          </p>
          <div className="w-8 h-8 mx-auto border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-gold" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground mb-2">
            Reset Your Password
          </h1>
          <p className="text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            {error.includes('expired') && (
              <Link
                href="/forgot-password"
                className="block mt-2 text-gold hover:underline"
              >
                Request a new reset link
              </Link>
            )}
          </div>
        )}

        {/* Form */}
        {!error?.includes('expired') && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                New Password
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
                Confirm New Password
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
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
