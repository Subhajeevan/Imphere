import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/explore/suggested
 * Get suggested users to follow (top users by standing)
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    // Get top users by standing
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, badge, standing')
      .eq('onboarding_status', 'active')
      .order('standing', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Suggested users error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch suggestions' },
        { status: 500 }
      )
    }

    // Get follow status
    let followingIds: string[] = []
    if (currentUser && users && users.length > 0) {
      const userIds = users.map((u) => u.id)
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUser.id)
        .in('following_id', userIds)

      followingIds = follows?.map((f) => f.following_id) || []
    }

    // Filter out current user and already following
    const transformedUsers = users
      ?.filter(
        (u) => u.id !== currentUser?.id && !followingIds.includes(u.id)
      )
      .slice(0, 10)
      .map((user) => ({
        id: user.id,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        badge: user.badge,
        standing: user.standing,
        isFollowing: false,
      }))

    return NextResponse.json({ users: transformedUsers })
  } catch (error) {
    console.error('Suggested API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
