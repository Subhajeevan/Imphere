import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProfilePage } from './ProfilePage'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  // Fetch the profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      `
      id,
      display_name,
      avatar_url,
      bio,
      standing,
      impact_credits,
      badge,
      native_pin_name,
      created_at
    `
    )
    .eq('id', id)
    .single()

  if (error || !profile) {
    notFound()
  }

  // Check if following
  let isFollowing = false
  if (currentUser && currentUser.id !== id) {
    const { data: followData } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', id)
      .single()
    isFollowing = !!followData
  }

  // Get counts
  const [postResult, challengeResult, followerResult, followingResult] = await Promise.all([
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', id)
      .eq('is_approved', true),
    supabase
      .from('challenge_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id)
      .eq('status', 'verified'),
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', id),
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', id),
  ])

  // Current user profile for sidebar
  let currentUserProfile = null
  if (currentUser) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, standing, badge')
      .eq('id', currentUser.id)
      .single()
    currentUserProfile = data
  }

  return (
    <ProfilePage
      profile={{
        id: profile.id,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        bio: profile.bio,
        standing: profile.standing,
        impactCredits: profile.impact_credits,
        badge: profile.badge,
        nativePin: profile.native_pin_name,
        believers: followerResult.count || 0,
        believing: followingResult.count || 0,
        postCount: postResult.count || 0,
        challengeCount: challengeResult.count || 0,
        isFollowing,
        isOwnProfile: currentUser?.id === id,
        createdAt: profile.created_at,
      }}
      currentUser={
        currentUserProfile
          ? {
              displayName: currentUserProfile.display_name,
              avatarUrl: currentUserProfile.avatar_url,
              standing: currentUserProfile.standing,
              badge: currentUserProfile.badge,
            }
          : undefined
      }
    />
  )
}
