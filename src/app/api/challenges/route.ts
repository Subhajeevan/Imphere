import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

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
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const categoriesParam = searchParams.get('categories') || searchParams.get('category')
    const search = searchParams.get('search') || ''
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    if (USE_MOCK_DATA) {
      const currentUserId = USER_IDS.arjun
      let mockChallenges = mockData.challenges.filter(c => c.status === 'active')

      if (type === 'welfare') {
        mockChallenges = mockChallenges.filter(c => c.type === 'static')
      } else if (type === 'proclamation') {
        mockChallenges = mockChallenges.filter(c => c.type === 'proclamation')
      }

      const categoryIds = categoriesParam ? categoriesParam.split(',').map(id => id.trim()).filter(Boolean) : []
      if (categoryIds.length > 0) {
        mockChallenges = mockChallenges.filter(c => c.category_id && categoryIds.includes(c.category_id))
      }

      if (search.trim()) {
        const s = search.trim().toLowerCase()
        mockChallenges = mockChallenges.filter(c => c.title.toLowerCase().includes(s))
      }

      mockChallenges.sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime())

      if (cursor) {
        const cursorIndex = mockChallenges.findIndex(c => c.id === cursor)
        if (cursorIndex !== -1) {
          mockChallenges = mockChallenges.slice(cursorIndex + 1)
        }
      }

      mockChallenges = mockChallenges.slice(0, limit)

      const transformedChallenges = mockChallenges.map(challenge => {
        const category = mockData.challengeCategories.find(cat => cat.id === challenge.category_id)
        const creator = mockData.profiles.find(p => p.id === challenge.created_by)
        
        return {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          type: challenge.type,
          standingReward: challenge.standing_reward,
          creditReward: challenge.ic_reward,
          participantCount: challenge.participant_count,
          expiresAt: challenge.expires_at,
          localityName: challenge.locality_name,
          category: category ? {
            id: category.id,
            name: category.name,
            icon: category.icon,
          } : null,
          creator: creator ? {
            id: creator.id,
            displayName: creator.display_name,
            avatarUrl: creator.avatar_url,
            badge: creator.badge,
          } : null,
          isAccepted: mockData.challengeSubmissions.some(sub => sub.challenge_id === challenge.id && sub.user_id === currentUserId),
          createdAt: challenge.created_at,
        }
      })

      const nextCursor = transformedChallenges.length === limit ? transformedChallenges[transformedChallenges.length - 1].id : null

      return NextResponse.json({
        challenges: transformedChallenges,
        nextCursor,
      })
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Parse multi-category IDs
    const categoryIds = categoriesParam
      ? categoriesParam.split(',').map((id) => id.trim()).filter(Boolean)
      : []

    let query = db
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
      const challengeIds = challenges.map((c: { id: string }) => c.id)
      const { data: submissions } = await db
        .from('challenge_submissions')
        .select('challenge_id')
        .eq('user_id', user.id)
        .in('challenge_id', challengeIds)

      acceptedChallengeIds = submissions?.map((s: { challenge_id: string }) => s.challenge_id) || []
    }

    // Transform challenges for response
    const transformedChallenges = challenges?.map((challenge: {
      id: string; title: string; description: string; type: string;
      standing_reward: number; ic_reward: number; participant_count: number;
      expires_at: string; locality_name: string; created_at: string;
      category: { id: string; name: string; icon: string } | null;
      creator: { id: string; display_name: string; avatar_url: string; badge: string } | null;
    }) => ({
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
      challenges && (challenges as { id: string }[]).length === limit
        ? (challenges as { id: string }[])[challenges.length - 1].id
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
