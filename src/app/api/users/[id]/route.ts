import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

/**
 * GET /api/users/[id]
 * Fetch user profile by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    
    if (USE_MOCK_DATA) {
      const currentUserId = USER_IDS.arjun
      
      const profile = mockData.profiles.find(p => p.id === userId)
      if (!profile) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const isFollowing = mockData.follows.some(f => f.follower_id === currentUserId && f.following_id === userId)
      
      const postCount = mockData.posts.filter(p => p.author_id === userId && p.moderation_status === 'approved').length
      const challengeCount = mockData.challengeSubmissions.filter(s => s.user_id === userId && s.status === 'verified').length
      const followerCount = mockData.follows.filter(f => f.following_id === userId).length
      const followingCount = mockData.follows.filter(f => f.follower_id === userId).length

      return NextResponse.json({
        profile: {
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
          isOwnProfile: currentUserId === userId,
          createdAt: profile.created_at,
        },
      })
    }

    const supabase = await createClient() as any
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    // Fetch profile
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
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if current user is following this profile
    let isFollowing = false
    if (currentUser && currentUser.id !== userId) {
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId)
        .single()

      isFollowing = !!followData
    }

    // Get counts
    const [postResult, challengeResult, followerResult, followingResult] = await Promise.all([
      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId)
        .eq('is_approved', true),
      supabase
        .from('challenge_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'verified'),
      supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', userId),
      supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', userId),
    ])

    const postCount = postResult.count || 0
    const challengeCount = challengeResult.count || 0
    const followerCount = followerResult.count || 0
    const followingCount = followingResult.count || 0

    return NextResponse.json({
      profile: {
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
        isOwnProfile: currentUser?.id === userId,
        createdAt: profile.created_at,
      },
    })
  } catch (error) {
    console.error('User profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
