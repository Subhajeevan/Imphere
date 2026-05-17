import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/search
 * Search users by name
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] })
    }

    // Search users by display name
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, badge, standing')
      .ilike('display_name', `%${query}%`)
      .order('standing', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Search error:', error)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
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

    const transformedUsers = users
      ?.filter((u) => u.id !== currentUser?.id)
      .map((user) => ({
        id: user.id,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        badge: user.badge,
        standing: user.standing,
        isFollowing: followingIds.includes(user.id),
      }))

    return NextResponse.json({ users: transformedUsers })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
