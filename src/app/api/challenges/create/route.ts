import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/challenges/create
 * Create a simple proclamation challenge.
 * This route uses the app's normal authenticated user session.
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
    const { title, description, categoryId, localityName } = body as {
      title: string
      description: string
      categoryId?: string
      localityName?: string
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!description?.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    const { data: challenge, error } = await supabase
      .from('challenges')
      .insert({
        type: 'proclamation',
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId || null,
        locality_name: localityName?.trim() || null,
        created_by: user.id,
        expires_at: expiresAt,
        status: 'active',
        standing_reward: 100,
        ic_reward: 50,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Challenge create error:', error)
      return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 })
    }

    return NextResponse.json({ challenge }, { status: 201 })
  } catch (error) {
    console.error('Challenges create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
