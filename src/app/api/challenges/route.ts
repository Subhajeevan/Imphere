import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/challenges
 * Fetch active challenges with optional filters
 *
 * Query params:
 * - type: 'welfare' | 'proclamation' | 'all'
 * - category: category slug
 * - locality: locality ID
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
    const category = searchParams.get('category')
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

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

    // Apply category filter
    if (category) {
      query = query.eq('category_id', category)
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
