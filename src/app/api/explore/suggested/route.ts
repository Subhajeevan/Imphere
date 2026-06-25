import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

/**
 * GET /api/explore/suggested
 * Get suggested users to follow (top users by standing)
 */
export async function GET() {
  try {
    if (USE_MOCK_DATA) {
      const currentUserId = USER_IDS.arjun
      
      const followingIds = mockData.follows
        .filter(f => f.follower_id === currentUserId)
        .map(f => f.following_id)

      const transformedUsers = mockData.profiles
        .filter(u => u.id !== currentUserId && !followingIds.includes(u.id) && u.onboarding_status === 'active')
        .sort((a, b) => (b.standing || 0) - (a.standing || 0))
        .slice(0, 10)
        .map(user => ({
          id: user.id,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          badge: user.badge,
          standing: user.standing,
          isFollowing: false,
        }))

      return NextResponse.json({ users: transformedUsers })
    }

    const supabase = await createClient() as any as any as any
    const db = supabase as any
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    // Get top users by standing
    const { data: users, error } = await db
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
      const userIds = users.map((u: any) => u.id)
      const { data: follows } = await db
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUser.id)
        .in('following_id', userIds)

      followingIds = follows?.map((f: any) => f.following_id) || []
    }

    // Filter out current user and already following
    const transformedUsers = users
      ?.filter((u: any) => u.id !== currentUser?.id && !followingIds.includes(u.id))
      .slice(0, 10)
      .map((user: any) => ({
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
