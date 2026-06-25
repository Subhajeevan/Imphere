import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'

/**
 * POST /api/challenges/[id]/submit
 * Submit photo proof for a challenge.
 * Auto-verified in testing mode.
 * Creates a feed post + notification.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: challengeId } = await params
    const body = await request.json()
    const { mediaUrl, caption, localityName } = body as {
      mediaUrl: string
      caption?: string
      localityName?: string
    }

    if (!mediaUrl) {
      return NextResponse.json({ error: 'mediaUrl is required' }, { status: 400 })
    }

    if (USE_MOCK_DATA) {
      return NextResponse.json({
        success: true,
        standingAwarded: 50,
        icAwarded: 200,
        message: 'Proof submitted and auto-verified! (mock mode)',
      })
    }

    const supabase = await createClient() as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch challenge
    const { data: challenge } = await db
      .from('challenges')
      .select('id, title, standing_reward, ic_reward, status')
      .eq('id', challengeId)
      .single()

    if (!challenge || challenge.status !== 'active') {
      return NextResponse.json({ error: 'Challenge not found or inactive' }, { status: 404 })
    }

    const standingReward: number = challenge.standing_reward ?? 50
    const icReward: number       = challenge.ic_reward ?? 200
    const now = new Date().toISOString()
    const ADMIN_VERIFIER_ID = '9070c655-a831-4a18-9f08-0e3bf31b64ea'

    // 2. Upsert submission → verified
    const { data: existing, error: existingError } = await db
      .from('challenge_submissions')
      .select('id, status')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('challenge submission lookup error:', existingError)
      return NextResponse.json({ error: 'Failed to validate existing submission' }, { status: 500 })
    }

    let submissionId: string

    if (existing) {
      const { error: updateErr } = await db
        .from('challenge_submissions')
        .update({
          media_url:         mediaUrl,
          media_type:        'image',
          status:            'verified',
          standing_awarded:  standingReward,
          ic_awarded:        icReward,
          verified_at:       now,
          verified_by:       ADMIN_VERIFIER_ID,
          claimed_timestamp: now,
        })
        .eq('id', existing.id)

      if (updateErr) {
        console.error('challenge submission update error:', updateErr)
        return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
      }

      submissionId = existing.id

      // Award rewards only if not already verified
      if (existing.status !== 'verified') {
        const { data: prof } = await db
          .from('profiles')
          .select('standing, impact_credits')
          .eq('id', user.id)
          .single()
        if (prof) {
          await db.from('profiles').update({
            standing:       (prof.standing ?? 0) + standingReward,
            impact_credits: (prof.impact_credits ?? 0) + icReward,
          }).eq('id', user.id)
        }
      }
    } else {
      // Insert new verified submission
      const { data: inserted, error: insertErr } = await db
        .from('challenge_submissions')
        .insert({
          challenge_id:     challengeId,
          user_id:          user.id,
          media_url:        mediaUrl,
          media_type:       'image',
          claimed_location: 'SRID=4326;POINT(0 0)',
          status:           'verified',
          standing_awarded: standingReward,
          ic_awarded:       icReward,
          verified_at:      now,
          verified_by:      ADMIN_VERIFIER_ID,
          claimed_timestamp: now,
        })
        .select('id')
        .single()

      if (insertErr || !inserted) {
        return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 })
      }
      submissionId = inserted.id

      const { data: prof } = await db
        .from('profiles')
        .select('standing, impact_credits')
        .eq('id', user.id)
        .single()
      if (prof) {
        await db.from('profiles').update({
          standing:       (prof.standing ?? 0) + standingReward,
          impact_credits: (prof.impact_credits ?? 0) + icReward,
        }).eq('id', user.id)
      }
    }

    // 3. Create feed post so it appears in the Challenges tab
    await db.from('posts').insert({
      author_id:          user.id,
      caption:            caption?.trim() || `Completed the "${challenge.title}" challenge! 🏆`,
      media_url:          mediaUrl,
      media_type:         'image',
      challenge_id:       challengeId,
      submission_id:      submissionId,
      is_challenge_proof: true,
      is_approved:        true,
      moderation_status:  'approved',
      locality_name:      localityName?.trim() || null,
      vouch_count:        0,
      comment_count:      0,
      save_count:         0,
    })

    // 4. Notification
    await db.from('notifications').insert({
      user_id:              user.id,
      type:                 'challenge_verified',
      title:                'Challenge Verified! 🎉',
      message:              `Your proof for "${challenge.title}" was accepted. +${standingReward} Standing · +${icReward} IC`,
      related_challenge_id: challengeId,
      is_read:              false,
    })

    // 5. Increment challenge completion_count
    const { data: ch } = await db
      .from('challenges')
      .select('completion_count')
      .eq('id', challengeId)
      .single()
    if (ch) {
      await db.from('challenges')
        .update({ completion_count: (ch.completion_count ?? 0) + 1 })
        .eq('id', challengeId)
    }

    return NextResponse.json({
      success: true,
      submissionId,
      standingAwarded: standingReward,
      icAwarded:       icReward,
      message:         `Proof submitted! +${standingReward} Standing · +${icReward} IC credited.`,
    })
  } catch (error) {
    console.error('Submit proof error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
