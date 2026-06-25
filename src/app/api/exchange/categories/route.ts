import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ExchangeCategory, ProductCategory } from '@/types/exchange'

const CATEGORY_META: Record<string, { label: string; emoji: string; bgColor: string }> = {
  eco:         { label: 'Eco Products',    emoji: '🌱', bgColor: 'bg-emerald-50' },
  electronics: { label: 'Electronics',     emoji: '📱', bgColor: 'bg-blue-50'    },
  'gift-cards':{ label: 'Gift Cards',      emoji: '🎁', bgColor: 'bg-violet-50'  },
  food:        { label: 'Food & Dining',   emoji: '🍕', bgColor: 'bg-orange-50'  },
  travel:      { label: 'Travel',          emoji: '✈️', bgColor: 'bg-sky-50'     },
  health:      { label: 'Health',          emoji: '💊', bgColor: 'bg-red-50'     },
  learning:    { label: 'Learning',        emoji: '📚', bgColor: 'bg-purple-50'  },
  fitness:     { label: 'Fitness',         emoji: '💪', bgColor: 'bg-lime-50'    },
  plants:      { label: 'Plants',          emoji: '🌿', bgColor: 'bg-green-50'   },
  fashion:     { label: 'Fashion',         emoji: '👗', bgColor: 'bg-pink-50'    },
  events:      { label: 'Events',          emoji: '🎫', bgColor: 'bg-amber-50'   },
  digital:     { label: 'Digital',         emoji: '💻', bgColor: 'bg-indigo-50'  },
  donations:   { label: 'Donations',       emoji: '❤️', bgColor: 'bg-rose-50'    },
  local:       { label: 'Local Merchants', emoji: '🏪', bgColor: 'bg-yellow-50'  },
  exclusive:   { label: 'Exclusive',       emoji: '👑', bgColor: 'bg-slate-50'   },
}

export async function GET() {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('exchange_products')
      .select('category')
      .eq('is_active', true)

    if (error) {
      console.error('GET /api/exchange/categories error:', error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    const counts: Record<string, number> = {}
    for (const row of (data ?? [])) {
      counts[row.category] = (counts[row.category] ?? 0) + 1
    }

    const categories: ExchangeCategory[] = Object.entries(CATEGORY_META)
      .filter(([id]) => (counts[id] ?? 0) > 0)
      .map(([id, meta]) => ({
        id:      id as ProductCategory,
        label:   meta.label,
        emoji:   meta.emoji,
        bgColor: meta.bgColor,
        count:   counts[id] ?? 0,
      }))

    return NextResponse.json({ categories })
  } catch (err) {
    console.error('GET /api/exchange/categories unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
