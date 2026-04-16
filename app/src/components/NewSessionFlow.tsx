'use client'

import { useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

import { Musharata } from '@/components/steps/Musharata'

const STEP = { ar: 'المشارطة', en: 'Musharata', subtitle: 'Set your conditions' }

type CarryForward = {
  change_for_tomorrow: string
  carry_tasks: Array<{ text: string; bucket?: string }>
  previous_completed_at: string | null
}

type UnfinishedHint = {
  previous_tasks: Array<{ text: string; bucket?: string }>
  completed_count: number
  total_count: number
}

export function NewSessionFlow({
  userId,
  sessionName,
  sessionMode,
  carryForward,
  unfinishedHint,
}: {
  userId: string
  sessionName: string | null
  sessionMode: 'time_block' | 'full_day'
  carryForward?: CarryForward | null
  unfinishedHint?: UnfinishedHint | null
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const handleMusharataComplete = useCallback(async (data: Record<string, unknown>) => {
    // Save location to profile if we got it from the geolocation request
    const lat = data._lat as number | undefined
    const lng = data._lng as number | undefined
    if (lat && lng) {
      await supabase
        .from('profiles')
        .update({ location_lat: lat, location_lng: lng })
        .eq('id', userId)
    }

    // Now create the session with musharata data already filled, starting at step 2
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        name: sessionName,
        current_step: 2,
        status: 'active',
        musharata: {
          mode: sessionMode,
          tasks: data.tasks,
          blocks: data.blocks,
          avoidances: data.avoidances,
          boundaries: data.boundaries,
          time_block_start: data.time_block_start,
          time_block_end: data.time_block_end,
          dua_recited: data.dua_recited,
        },
      })
      .select()
      .single()

    if (!error && session) {
      router.replace(`/session/${session.id}`)
    }
  }, [supabase, userId, sessionName, sessionMode, router])

  // Dummy session object for Musharata component (it needs the shape but we're at step 1)
  const dummySession = {
    id: '',
    user_id: userId,
    name: sessionName,
    current_step: 1,
    status: 'active' as const,
    musharata: null,
    muraqaba: null,
    muhasaba: null,
    muaqaba: null,
    mujahada: null,
    muataba: null,
    started_at: new Date().toISOString(),
    completed_at: null,
    session_duration_minutes: null,
  }

  return (
    <main className="flex-1 flex flex-col min-h-screen">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="px-8 py-5 border-b border-border-subtle relative z-10"
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <span className="arabic text-gold text-sm leading-none">سَيْر</span>
            <span className="text-text-muted text-[11px]">/</span>
            <span className="text-text-secondary text-xs tracking-wide">
              {sessionName || 'New Session'}
            </span>
          </a>
          <div className="flex items-center gap-2">
            <div className="step-dot active" />
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-6 h-px bg-border-subtle" />
                <div className="step-dot" />
              </div>
            ))}
          </div>
        </div>
      </motion.header>

      {/* Step header */}
      <div className="px-8 pt-8 pb-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center space-y-1">
          <motion.div
            initial={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="space-y-1"
          >
            <p
              className="arabic text-gold text-2xl"
              style={{ textShadow: '0 0 24px rgba(212, 175, 55, 0.18)' }}
            >
              {STEP.ar}
            </p>
            <h2 className="text-2xl font-light text-text-primary tracking-[-0.02em]">
              {STEP.en}
            </h2>
            <p className="text-text-muted text-xs tracking-wide mt-0.5">
              Step 1 of 6 — {STEP.subtitle}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-12 overflow-hidden relative z-10">
        <div className="max-w-2xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ x: 200, opacity: 0, filter: 'blur(4px)' }}
              animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
              transition={{ type: 'spring', stiffness: 200, damping: 26, mass: 0.8 }}
            >
              <Musharata
                session={dummySession}
                mode={sessionMode}
                carryForward={carryForward ?? null}
                unfinishedHint={unfinishedHint ?? null}
                onComplete={handleMusharataComplete}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
