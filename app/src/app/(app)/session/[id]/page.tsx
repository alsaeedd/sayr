import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SessionFlow } from '@/components/SessionFlow'
import { SessionReview } from '@/components/SessionReview'
import type { Session } from '@/lib/types'

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!session) redirect('/dashboard')

  const s = session as Session

  // Completed sessions get a read-only recap; active ones continue the flow.
  if (s.status === 'completed') {
    return <SessionReview session={s} />
  }

  return <SessionFlow session={s} />
}
