import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { HomePage } from './HomePage'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

export default async function Page() {
  if (USE_MOCK_DATA) {
    const profile = mockData.profiles.find(p => p.id === USER_IDS.arjun)
    return (
      <HomePage
        user={
          profile
            ? {
                displayName: profile.display_name || '',
                avatarUrl: profile.avatar_url || undefined,
                standing: profile.standing || 0,
                badge: profile.badge || 'Citizen',
              }
            : undefined
        }
      />
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Authenticated users see the feed
  if (user) {
    // Fetch user profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, standing, badge')
      .eq('id', user.id)
      .single()

    const profile = profileData as any

    return (
      <HomePage
        user={
          profile
            ? {
                displayName: profile.display_name || '',
                avatarUrl: profile.avatar_url || undefined,
                standing: profile.standing || 0,
                badge: profile.badge || 'Citizen',
              }
            : undefined
        }
      />
    )
  }

  // Unauthenticated users see landing page
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      {/* Hero Section */}
      <div className="text-center max-w-2xl mx-auto">
        {/* Logo */}
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-gold mb-4">
          IMPHERE
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-muted-foreground font-serif mb-8">
          Build Your Standing. Resolve the Future.
        </p>

        {/* Description */}
        <p className="text-base text-muted-foreground mb-12 max-w-md mx-auto">
          Join your community in completing civic challenges, earning reputation,
          and making a real impact where you live.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="btn-gold text-lg px-8 py-3 rounded-full"
          >
            Get Started
          </Link>
          <Link
            href="/explore"
            className="btn-gold-outline text-lg px-8 py-3 rounded-full"
          >
            Explore Challenges
          </Link>
        </div>
      </div>

      {/* Stats Preview */}
      <div className="mt-16 grid grid-cols-3 gap-8 text-center">
        <div>
          <p className="text-3xl font-bold text-gold">10K+</p>
          <p className="text-sm text-muted-foreground">Active Citizens</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-gold">50K+</p>
          <p className="text-sm text-muted-foreground">Challenges Completed</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-gold">100+</p>
          <p className="text-sm text-muted-foreground">Impact Circles</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        <p>A civic initiative for community empowerment</p>
      </footer>
    </main>
  )
}
