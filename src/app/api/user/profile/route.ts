import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/user/profile
 * Update current user's profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { displayName, bio, avatarUrl } = body as {
      displayName?: string
      bio?: string
      avatarUrl?: string
    }

    const updates: Record<string, any> = {}

    if (displayName !== undefined) {
      if (!displayName.trim() || displayName.length > 100) {
        return NextResponse.json(
          { error: 'Display name must be between 1 and 100 characters' },
          { status: 400 }
        )
      }
      updates.display_name = displayName.trim()
    }

    if (bio !== undefined) {
      if (bio.length > 160) {
        return NextResponse.json(
          { error: 'Bio must be 160 characters or less' },
          { status: 400 }
        )
      }
      updates.bio = bio
    }

    if (avatarUrl !== undefined) {
      updates.avatar_url = avatarUrl
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    updates.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
