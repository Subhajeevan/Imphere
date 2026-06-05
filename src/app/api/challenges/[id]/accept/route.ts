import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/challenges/[id]/accept
 * Accept a challenge (create a pending submission)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: challengeId } = await params
    const now = new Date()
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if challenge exists and is active
    const { data: challenge, error: challengeError } = await db
      .from('challenges')
      .select(
        'id, status, standing_reward, ic_reward, participant_count, completion_count'
      )
      .eq('id', challengeId)
      .single()

    if (challengeError || !challenge) {
      console.error('challenge lookup error:', challengeError)
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      )
    }

    if (challenge.status !== 'active') {
      return NextResponse.json(
        { error: 'Challenge is not active' },
        { status: 400 }
      )
    }

    const {
      data: existingSubmission,
      error: submissionError,
    } = await db
      .from('challenge_submissions')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .single()
    // Check if already at max participants
    // if (
    //   challenge.max_participants &&
    //   challenge.current_participants >= challenge.max_participants
    // ) {
    //   return NextResponse.json(
    //     { error: 'Challenge has reached maximum participants' },
    //     { status: 400 }
    //   )

    if (submissionError && submissionError.code !== 'PGRST116') {
      console.error('challenge submission lookup error:', submissionError)
      return NextResponse.json(
        { error: 'Failed to validate challenge acceptance' },
        { status: 500 }
      )
    }

    if (existingSubmission) {
      return NextResponse.json(
        { error: 'You have already accepted this challenge' },
        { status: 400 }
      )
    }

    const timestamp = new Date().toISOString()

    const { error: insertError } = await db
      .from('challenge_submissions')
      .insert({
        challenge_id: challengeId,
        user_id: user.id,
        status: 'pending',
        media_url: '',
        media_type: 'image',
        claimed_location: 'SRID=4326;POINT(78.4867 17.3850)',
        exif_location: 'SRID=4326;POINT(78.4867 17.3850)',
        claimed_timestamp: timestamp,
        exif_timestamp: timestamp,
        location_distance_meters: 0,
        location_verified: true,
        created_at: timestamp,
      })

    if (insertError) {
      console.error('Failed to accept challenge:', insertError)
      return NextResponse.json(
        { error: 'Failed to accept challenge' },
        { status: 500 }
      )
    }

    const { error: challengeUpdateError } = await db
      .from('challenges')
      .update({
        participant_count: (challenge.participant_count ?? 0) + 1,
      })
      .eq('id', challengeId)

    if (challengeUpdateError) {
      console.error('Failed to update challenge counts:', challengeUpdateError)
      return NextResponse.json(
        { error: 'Failed to update challenge status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Accept challenge error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
