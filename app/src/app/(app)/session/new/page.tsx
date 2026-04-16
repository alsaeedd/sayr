import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewSessionFlow } from '@/components/NewSessionFlow'
import type { MuatabaData, MuhasabaData, MusharataData } from '@/lib/types'

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

  // Pull the most recently completed session so we can offer to carry forward
  // intentional handoffs: muataba.change_for_tomorrow, and any unfinished tasks
  // captured during muhasaba/musharata. These are suggestions, never forced.
  const { data: lastSession } = await supabase
    .from('sessions')
    .select('musharata, muhasaba, muataba, completed_at')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const muataba = (lastSession?.muataba as MuatabaData | null) ?? null
  const muhasaba = (lastSession?.muhasaba as MuhasabaData | null) ?? null
  const previousMusharata = (lastSession?.musharata as MusharataData | null) ?? null

  // Build the carry-forward hint. Only the pieces that are actually present
  // get surfaced; Musharata silently ignores empty ones.
  const carryForward = muataba?.change_for_tomorrow?.trim()
    ? {
        change_for_tomorrow: muataba.change_for_tomorrow.trim(),
        // Unfinished tasks: those in the previous Musharata not flagged
        // completed in Muhasaba's task rollup (we only store aggregate counts
        // today, so the Muataba `carry_tasks` field carries explicit picks).
        carry_tasks: muataba.carry_tasks ?? [],
        previous_completed_at: lastSession?.completed_at ?? null,
      }
    : muataba?.carry_tasks?.length
      ? {
          change_for_tomorrow: '',
          carry_tasks: muataba.carry_tasks,
          previous_completed_at: lastSession?.completed_at ?? null,
        }
      : null

  // Fall back: if no carry_tasks were explicitly set but the previous session
  // had unfinished work (tasks_completed < tasks_total), surface the original
  // task list so the user can pick from it.
  const unfinishedHint =
    !carryForward && previousMusharata && muhasaba &&
    muhasaba.tasks_completed < muhasaba.tasks_total
      ? {
          previous_tasks: previousMusharata.tasks.map(t => ({
            text: t.text,
            bucket: t.bucket,
          })),
          completed_count: muhasaba.tasks_completed,
          total_count: muhasaba.tasks_total,
        }
      : null

  return (
    <NewSessionFlow
      userId={user.id}
      sessionName={name || null}
      sessionMode={sessionMode}
      carryForward={carryForward}
      unfinishedHint={unfinishedHint}
    />
  )
}
