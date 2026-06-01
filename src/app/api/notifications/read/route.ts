import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/notifications/read
 * Mark notifications as read
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
    const { ids } = body as { ids: string[] }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { error } = await (supabase
      .from('notifications') as any)
      .update({ is_read: true })
      .eq('user_id', user.id)
      .in('id', ids)

    if (error) {
      console.error('Failed to mark notifications as read:', error)
      return NextResponse.json(
        { error: 'Failed to update notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notifications read error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
