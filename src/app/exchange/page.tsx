import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExchangePage } from './ExchangePage'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

export default async function Page() {
  if (USE_MOCK_DATA) {
    const profile = mockData.profiles.find(p => p.id === USER_IDS.arjun)
    return (
      <ExchangePage
        user={
          profile
            ? {
                displayName: profile.display_name,
                avatarUrl: profile.avatar_url,
                standing: profile.standing,
                badge: profile.badge,
              }
            : undefined
        }
        impactCredits={profile?.impact_credits || 0}
        vouchers={mockData.vouchers.map(v => ({
          id: v.id,
          title: v.title,
          description: v.description,
          image_url: v.image_url,
          ic_cost: v.ic_cost,
          stock: 10,
          merchant_name: v.merchant_name
        }))}
      />
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, standing, badge, impact_credits')
    .eq('id', user.id)
    .single()

  // Fetch available vouchers
  const { data: vouchers } = await supabase
    .from('vouchers')
    .select('id, title, description, image_url, ic_cost, stock, merchant_name')
    .eq('is_active', true)
    .gt('stock', 0)
    .order('ic_cost', { ascending: true })

  return (
    <ExchangePage
      user={
        profile
          ? {
              displayName: profile.display_name,
              avatarUrl: profile.avatar_url,
              standing: profile.standing,
              badge: profile.badge,
            }
          : undefined
      }
      impactCredits={profile?.impact_credits || 0}
      vouchers={vouchers || []}
    />
  )
}
