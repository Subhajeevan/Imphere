import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const type = searchParams.get('type') // 'signup', 'recovery', etc.

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Handle password recovery - redirect to reset password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }

      // For signup or login, check onboarding status
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('onboarding_status')
          .eq('id', user.id)
          .single()

        const profile = profileData as any

        // Redirect to onboarding if not completed
        if (profile?.onboarding_status === 'incomplete') {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }

      // Redirect to intended destination or home
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // OAuth/Auth error - redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
