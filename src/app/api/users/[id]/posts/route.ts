import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/users/[id]/posts
 * Fetch user's posts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    const supabase = await createClient()
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    const { searchParams } = new URL(request.url)
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
        challenge:challenges (
          title
        )
      `
      )
      .eq('author_id', userId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      query = query.lt('id', cursor)
    }

    const { data: posts, error } = await query

    if (error) {
      console.error('Posts fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      )
    }

    // Get vouch/save status for current user
    let vouchedPostIds: string[] = []
    let savedPostIds: string[] = []

    if (currentUser && posts && posts.length > 0) {
      const postIds = posts.map((p) => p.id)

      const [vouchResult, saveResult] = await Promise.all([
        supabase
          .from('vouches')
          .select('post_id')
          .eq('user_id', currentUser.id)
          .in('post_id', postIds),
        supabase
          .from('saves')
          .select('post_id')
          .eq('user_id', currentUser.id)
          .in('post_id', postIds),
      ])

      vouchedPostIds = vouchResult.data?.map((v) => v.post_id) || []
      savedPostIds = saveResult.data?.map((s) => s.post_id) || []
    }

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
    }))

    const nextCursor =
      posts && posts.length === limit ? posts[posts.length - 1].id : null

    return NextResponse.json({
      posts: transformedPosts,
      nextCursor,
    })
  } catch (error) {
    console.error('User posts API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
