import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

/**
 * GET /api/user/me
 * Returns the currently authenticated user's profile.
 * Used by client components (like ExplorePage) that need the sidebar profile card.
 */
export async function GET() {
  try {
    if (USE_MOCK_DATA) {
      const profile = mockData.profiles.find(p => p.id === USER_IDS.arjun)
      if (!profile) return NextResponse.json({ profile: null })
      return NextResponse.json({
        profile: {
          id: profile.id,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          standing: profile.standing ?? 0,
          impactCredits: profile.impact_credits ?? 0,
          badge: profile.badge ?? 'Citizen',
          nativePinName: profile.native_pin_name,
        },
      })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ profile: null }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, standing, impact_credits, badge, native_pin_name')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ profile: null }, { status: 404 })
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        standing: profile.standing ?? 0,
        impactCredits: profile.impact_credits ?? 0,
        badge: profile.badge ?? 'Citizen',
        nativePinName: profile.native_pin_name,
      },
    })
  } catch (error) {
    console.error('GET /api/user/me error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
