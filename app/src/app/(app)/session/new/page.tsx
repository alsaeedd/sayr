import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewSessionFlow } from '@/components/NewSessionFlow'

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; mode?: string }>
}) {
  const { name, mode } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const sessionMode: 'time_block' | 'full_day' =
    mode === 'full_day' ? 'full_day' : 'time_block'

  return (
    <NewSessionFlow
      userId={user.id}
      sessionName={name || null}
      sessionMode={sessionMode}
    />
  )
}
