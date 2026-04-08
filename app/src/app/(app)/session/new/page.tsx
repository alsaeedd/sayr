import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewSessionFlow } from '@/components/NewSessionFlow'

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>
}) {
  const { name } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  return <NewSessionFlow userId={user.id} sessionName={name || null} />
}
