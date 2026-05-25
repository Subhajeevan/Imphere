import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/posts
 * Create a new regular post
 *
 * Body: { mediaUrl, mediaType, caption?, localityName? }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mediaUrl, mediaType = 'image', caption, localityName } = body as {
      mediaUrl: string
      mediaType?: 'image' | 'video'
      caption?: string
      localityName?: string
    }

    if (!mediaUrl) {
      return NextResponse.json({ error: 'mediaUrl is required' }, { status: 400 })
    }

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        media_url: mediaUrl,
        media_type: mediaType,
        caption: caption?.trim() || null,
        locality_name: localityName?.trim() || null,
        is_approved: true,
        moderation_status: 'approved',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Post insert error:', error)
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error('Posts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
