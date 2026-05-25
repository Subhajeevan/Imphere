import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/challenges
 * Fetch active challenges with optional filters
 *
 * Query params:
 * - type: 'welfare' | 'proclamation' | 'all'
 * - category: single category ID (legacy)
 * - categories: comma-separated category IDs (multi-select)
 * - search: text search on title
 * - cursor: pagination cursor
 * - limit: number of results (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const categoriesParam = searchParams.get('categories') || searchParams.get('category')
    const search = searchParams.get('search') || ''
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    // Parse multi-category IDs
    const categoryIds = categoriesParam
      ? categoriesParam.split(',').map((id) => id.trim()).filter(Boolean)
      : []

    let query = supabase
      .from('challenges')
      .select(
        `
        id,
        title,
        description,
        type,
        standing_reward,
        ic_reward,
        participant_count,
        expires_at,
        locality_name,
        created_at,
        category:challenge_categories (
          id,
          name,
          icon
        ),
        creator:profiles!challenges_created_by_fkey (
          id,
          display_name,
          avatar_url,
          badge
        )
      `
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply type filter
    if (type === 'welfare') {
      query = query.eq('type', 'static')
    } else if (type === 'proclamation') {
      query = query.eq('type', 'proclamation')
    }

    // Apply multi-category filter (uses Supabase .in())
    if (categoryIds.length === 1) {
      query = query.eq('category_id', categoryIds[0])
    } else if (categoryIds.length > 1) {
      query = query.in('category_id', categoryIds)
    }

    // Apply text search on title
    if (search.trim()) {
      query = query.ilike('title', `%${search.trim()}%`)
    }

    // Apply cursor for pagination
    if (cursor) {
      query = query.lt('id', cursor)
    }


    const { data: challenges, error } = await query

    if (error) {
      console.error('Challenges fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch challenges' },
        { status: 500 }
      )
    }

    // Get user's accepted challenges
    let acceptedChallengeIds: string[] = []
    if (user && challenges && challenges.length > 0) {
      const challengeIds = challenges.map((c) => c.id)
      const { data: submissions } = await supabase
        .from('challenge_submissions')
        .select('challenge_id')
        .eq('user_id', user.id)
        .in('challenge_id', challengeIds)

      acceptedChallengeIds = submissions?.map((s) => s.challenge_id) || []
    }

    // Transform challenges for response
    const transformedChallenges = challenges?.map((challenge) => ({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      type: challenge.type,
      standingReward: challenge.standing_reward,
      creditReward: challenge.ic_reward,
      participantCount: challenge.participant_count,
      expiresAt: challenge.expires_at,
      localityName: challenge.locality_name,
      category: challenge.category
        ? {
            id: challenge.category.id,
            name: challenge.category.name,
            icon: challenge.category.icon,
          }
        : null,
      creator: challenge.creator
        ? {
            id: challenge.creator.id,
            displayName: challenge.creator.display_name,
            avatarUrl: challenge.creator.avatar_url,
            badge: challenge.creator.badge,
          }
        : null,
      isAccepted: acceptedChallengeIds.includes(challenge.id),
      createdAt: challenge.created_at,
    }))

    // Determine next cursor
    const nextCursor =
      challenges && challenges.length === limit
        ? challenges[challenges.length - 1].id
        : null

    return NextResponse.json({
      challenges: transformedChallenges,
      nextCursor,
    })
  } catch (error) {
    console.error('Challenges API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/challenges
 * Raise a new Proclamation (community-raised challenge)
 *
 * Body: { title, description, categoryId?, localityName? }
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

    // Proclamations expire in 14 days
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
      console.error('Proclamation insert error:', error)
      return NextResponse.json({ error: 'Failed to raise proclamation' }, { status: 500 })
    }

    return NextResponse.json({ challenge }, { status: 201 })
  } catch (error) {
    console.error('Challenges POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
