import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/users/[id]/challenges
 * Fetch user's completed (verified) challenges
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 50)

    let query = supabase
      .from('challenge_submissions')
      .select(
        `
        id,
        media_url,
        verified_at,
        challenge_id,
        challenge:challenges (
          id,
          title,
          standing_reward,
          ic_reward
        )
      `
      )
      .eq('user_id', userId)
      .eq('status', 'verified')
      .order('verified_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      query = query.lt('id', cursor)
    }

    const { data: submissions, error } = await query

    if (error) {
      console.error('Challenges fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch challenges' },
        { status: 500 }
      )
    }

    const transformedChallenges = submissions?.map((submission) => ({
      id: submission.id,
      challengeId: submission.challenge_id,
      title: submission.challenge?.title,
      mediaUrl: submission.media_url,
      standingReward: submission.challenge?.standing_reward,
      creditReward: submission.challenge?.ic_reward,
      verifiedAt: submission.verified_at,
    }))

    const nextCursor =
      submissions && submissions.length === limit
        ? submissions[submissions.length - 1].id
        : null

    return NextResponse.json({
      challenges: transformedChallenges,
      nextCursor,
    })
  } catch (error) {
    console.error('User challenges API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
