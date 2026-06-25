import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExchangePage } from './ExchangePage'

export const metadata = {
  title: 'Exchange · IMPHERE',
  description: 'Redeem your Impact Credits for real rewards. Every redemption represents real change.',
}

export default async function Page() {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, standing, badge, impact_credits')
    .eq('id', user.id)
    .single()

  // Derive lifetime earned and redeemed from transaction log
  const { data: txns } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', user.id)

  const lifetimeEarned = (txns ?? [])
    .filter((t: any) => t.type === 'ic_earned' || t.type === 'ic_bonus')
    .reduce((sum: number, t: any) => sum + (t.amount ?? 0), 0)

  const pointsRedeemed = (txns ?? [])
    .filter((t: any) => t.type === 'ic_spent')
    .reduce((sum: number, t: any) => sum + (t.amount ?? 0), 0)

  return (
    <ExchangePage
      user={
        profile
          ? {
              displayName: profile.display_name,
              avatarUrl:   profile.avatar_url ?? undefined,
              standing:    profile.standing   ?? 0,
              badge:       profile.badge      ?? 'Citizen',
            }
          : undefined
      }
      impactCredits={profile?.impact_credits ?? 0}
      lifetimeEarned={lifetimeEarned || (profile?.impact_credits ?? 0) + pointsRedeemed}
      pointsRedeemed={pointsRedeemed}
    />
  )
}
