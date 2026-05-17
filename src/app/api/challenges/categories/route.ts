import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/challenges/categories
 * Fetch all challenge categories
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: categories, error } = await supabase
      .from('challenge_categories')
      .select('id, name, slug, icon, description')
      .order('name')

    if (error) {
      console.error('Categories fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Categories API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
