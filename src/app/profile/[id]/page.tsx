import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProfilePage } from './ProfilePage'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params

  if (USE_MOCK_DATA) {
    const {
      data: { user },
    } = await createClient().auth.getUser()

    let currentUserId = USER_IDS.arjun
    if (user) {
      const profileById = mockData.profiles.find(p => p.id === user.id)
      const profileByEmail = user.email
        ? mockData.profiles.find(p => p.email === user.email)
        : undefined

      currentUserId = profileById?.id ?? profileByEmail?.id ?? USER_IDS.arjun
    }

    const profile = mockData.profiles.find(p => p.id === id) || mockData.profiles[0]
    const currentUserProfile = mockData.profiles.find(p => p.id === currentUserId)

    const isFollowing = mockData.follows.some(f => f.follower_id === currentUserId && f.following_id === profile.id)
    
    const postCount = mockData.posts.filter(p => p.author_id === profile.id && p.moderation_status === 'approved').length
    const challengeCount = mockData.challengeSubmissions.filter(s => s.user_id === profile.id && s.status === 'verified').length
    const followerCount = mockData.follows.filter(f => f.following_id === profile.id).length
    const followingCount = mockData.follows.filter(f => f.follower_id === profile.id).length

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
          believers: followerCount,
          believing: followingCount,
          postCount,
          challengeCount,
          isFollowing,
          isOwnProfile: currentUserId === profile.id,
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
