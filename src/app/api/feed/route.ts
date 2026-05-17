import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/feed
 * Fetch feed posts based on type (for-you, believing, challenges)
 *
 * Query params:
 * - type: 'for-you' | 'believing' | 'challenges'
 * - cursor: pagination cursor (post ID)
 * - limit: number of posts (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'for-you'
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    let query = supabase
      .from('posts')
      .select(
        `
        id,
        caption,
        media_url,
        media_type,
        locality_name,
        created_at,
        vouch_count,
        comment_count,
        challenge_id,
        author:profiles!posts_author_id_fkey (
          id,
          display_name,
          avatar_url,
          badge,
          standing
        ),
        challenge:challenges (
          title
        )
      `
      )
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply type-specific filters
    if (type === 'believing' && user) {
      // Get posts from users the current user follows
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = following?.map((f) => f.following_id) || []

      if (followingIds.length > 0) {
        query = query.in('author_id', followingIds)
      } else {
        // No following, return empty
        return NextResponse.json({ posts: [], nextCursor: null })
      }
    } else if (type === 'challenges') {
      // Only posts that are challenge completions
      query = query.not('challenge_id', 'is', null)
    }

    // Apply cursor for pagination
    if (cursor) {
      query = query.lt('id', cursor)
    }

    const { data: posts, error } = await query

    if (error) {
      console.error('Feed fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch feed' },
        { status: 500 }
      )
    }

    // Get vouch status for current user
    let vouchedPostIds: string[] = []
    let savedPostIds: string[] = []

    if (user && posts && posts.length > 0) {
      const postIds = posts.map((p) => p.id)

      const [vouchResult, saveResult] = await Promise.all([
        supabase
          .from('vouches')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds),
        supabase
          .from('saves')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds),
      ])

      vouchedPostIds = vouchResult.data?.map((v) => v.post_id) || []
      savedPostIds = saveResult.data?.map((s) => s.post_id) || []
    }

    // Transform posts for response
    const transformedPosts = posts?.map((post) => ({
      id: post.id,
      content: post.caption,
      mediaUrl: post.media_url,
      mediaType: post.media_type,
      location: post.locality_name,
      createdAt: post.created_at,
      vouchCount: post.vouch_count,
      commentCount: post.comment_count,
      challengeTitle: post.challenge?.title || null,
      isVouched: vouchedPostIds.includes(post.id),
      isSaved: savedPostIds.includes(post.id),
      author: {
        id: post.author?.id,
        displayName: post.author?.display_name,
        avatarUrl: post.author?.avatar_url,
        badge: post.author?.badge,
      },
    }))

    // Determine next cursor
    const nextCursor =
      posts && posts.length === limit ? posts[posts.length - 1].id : null

    return NextResponse.json({
      posts: transformedPosts,
      nextCursor,
    })
  } catch (error) {
    console.error('Feed API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
