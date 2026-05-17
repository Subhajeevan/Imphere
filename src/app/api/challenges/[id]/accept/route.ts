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
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if challenge exists and is active
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, status, max_participants, current_participants')
      .eq('id', challengeId)
      .single()

    if (challengeError || !challenge) {
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

    // Check if already at max participants
    if (
      challenge.max_participants &&
      challenge.current_participants >= challenge.max_participants
    ) {
      return NextResponse.json(
        { error: 'Challenge has reached maximum participants' },
        { status: 400 }
      )
    }

    // Check if user already accepted this challenge
    const { data: existingSubmission } = await supabase
      .from('challenge_submissions')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .single()

    if (existingSubmission) {
      return NextResponse.json(
        { error: 'You have already accepted this challenge' },
        { status: 400 }
      )
    }

    // Create submission record
    const { error: insertError } = await supabase
      .from('challenge_submissions')
      .insert({
        challenge_id: challengeId,
        user_id: user.id,
        status: 'pending',
      })

    if (insertError) {
      console.error('Failed to accept challenge:', insertError)
      return NextResponse.json(
        { error: 'Failed to accept challenge' },
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
