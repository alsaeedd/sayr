import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from '@/components/DashboardClient'
import type { Session } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(20)

  const displayName = profile?.display_name || user.user_metadata?.full_name || 'Traveler'

  return (
    <DashboardClient
      userId={user.id}
      displayName={displayName}
      sessions={(sessions as Session[]) || []}
    />
  )
}
