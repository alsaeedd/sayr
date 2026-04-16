'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

import type { Session } from '@/lib/types'
import { Musharata } from '@/components/steps/Musharata'
import { Muraqaba } from '@/components/steps/Muraqaba'
import { Muhasaba } from '@/components/steps/Muhasaba'
import { Muaqaba } from '@/components/steps/Muaqaba'
import { Mujahada } from '@/components/steps/Mujahada'
import { Muataba } from '@/components/steps/Muataba'

const STEPS = [
  { num: 1, ar: 'المشارطة', en: 'Musharata', subtitle: 'Set your conditions' },
  { num: 2, ar: 'المراقبة', en: 'Muraqaba', subtitle: 'Watchful awareness' },
  { num: 3, ar: 'المحاسبة', en: 'Muhasaba', subtitle: 'Self-accounting' },
  { num: 4, ar: 'المعاقبة', en: "Mu'aqaba", subtitle: 'Course correction' },
  { num: 5, ar: 'المجاهدة', en: 'Mujahada', subtitle: 'Strive against the nafs' },
  { num: 6, ar: 'المعاتبة', en: "Mu'ataba", subtitle: 'Gentle self-reproach' },
]

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
    filter: 'blur(4px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 200 : -200,
    opacity: 0,
    filter: 'blur(4px)',
  }),
}

// Step identifier for the edit overlay — null means not editing.
type EditableStep = 'musharata' | 'muhasaba' | 'muaqaba' | 'mujahada' | null

export function SessionFlow({ session: initialSession }: { session: Session }) {
  const [session, setSession] = useState(initialSession)
  const [direction, setDirection] = useState(1)
  const [editingStep, setEditingStep] = useState<EditableStep>(null)
  const [editMenuOpen, setEditMenuOpen] = useState(false)
  const editMenuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Close the edit menu on outside click — standard popover behavior.
  useEffect(() => {
    if (!editMenuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (editMenuRef.current && !editMenuRef.current.contains(e.target as Node)) {
        setEditMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [editMenuOpen])

  const currentStep = session.current_step

  // Generic edit handler: writes the given stepKey's payload back to the session
  // row WITHOUT advancing current_step, and closes the edit overlay. Used for
  // all four earlier steps.
  const handleStepEdit = useCallback(
    async (stepKey: EditableStep, data: Record<string, unknown>) => {
      if (!stepKey) return
      let payload: Record<string, unknown> = data

      // Musharata needs its top-level mode preserved from the existing data
      // (it's not in the form state).
      if (stepKey === 'musharata') {
        const mode = session.musharata?.mode ?? 'time_block'
        payload = {
          mode,
          tasks: data.tasks,
          blocks: data.blocks,
          avoidances: data.avoidances,
          boundaries: data.boundaries,
          time_block_start: data.time_block_start,
          time_block_end: data.time_block_end,
          dua_recited: data.dua_recited,
        }
      }

      await supabase
        .from('sessions')
        .update({ [stepKey]: payload })
        .eq('id', session.id)

      setSession(prev => ({ ...prev, [stepKey]: payload as unknown }) as Session)
      setEditingStep(null)
    },
    [session.id, session.musharata, supabase],
  )

  const saveAndAdvance = useCallback(async (stepData: Record<string, unknown>, stepKey: string) => {
    const nextStep = currentStep + 1

    const updatePayload: Record<string, unknown> = {
      [stepKey]: stepData,
      current_step: nextStep > 6 ? 6 : nextStep,
    }

    // Only mark complete if this is mu'ataba (step 6) being submitted
    // AND all prior steps have data
    if (nextStep > 6 && stepKey === 'muataba') {
      const s = session
      const allStepsComplete = s.musharata && s.muraqaba && s.muhasaba && s.muaqaba && s.mujahada
      if (allStepsComplete) {
        const completedAt = new Date()
        updatePayload.status = 'completed'
        updatePayload.completed_at = completedAt.toISOString()
        // Compute total session wall-clock duration, floored at 1 so very
        // quick test sessions don't look like 0-minute ghosts.
        const startedAt = new Date(session.started_at).getTime()
        const durationMin = Math.max(1, Math.round((completedAt.getTime() - startedAt) / 60000))
        updatePayload.session_duration_minutes = durationMin
      }
    }

    await supabase
      .from('sessions')
      .update(updatePayload)
      .eq('id', session.id)

    if (nextStep > 6) {
      router.push('/dashboard')
      return
    }

    setDirection(1)
    setSession(prev => ({
      ...prev,
      ...updatePayload,
      [stepKey]: stepData,
      current_step: nextStep,
    } as Session))
  }, [currentStep, session, supabase, router])

  const startNewSession = useCallback(() => {
    router.push('/dashboard?new=1')
  }, [router])

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        // Shouldn't happen — sessions start at step 2 now. Redirect to new flow.
        router.push('/session/new')
        return null
      case 2:
        return (
          <Muraqaba
            session={session}
            onComplete={(data) => saveAndAdvance(data, 'muraqaba')}
            onEditMusharata={() => setEditingStep('musharata')}
          />
        )
      case 3:
        return <Muhasaba session={session} onComplete={(data) => saveAndAdvance(data, 'muhasaba')} />
      case 4:
        return <Muaqaba session={session} onComplete={(data) => saveAndAdvance(data, 'muaqaba')} />
      case 5:
        return <Mujahada session={session} onComplete={(data) => saveAndAdvance(data, 'mujahada')} />
      case 6:
        return (
          <Muataba
            session={session}
            onComplete={(data) => saveAndAdvance(data, 'muataba')}
            onStartNewSession={startNewSession}
          />
        )
      default:
        return null
    }
  }

  return (
    <main className="flex-1 flex flex-col min-h-screen">
      {/* Top bar with animated step indicators */}
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
            <span className="text-text-secondary text-xs tracking-wide">{session.name || 'Work Session'}</span>
          </a>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <motion.div
                    className={`step-dot ${
                      i < currentStep - 1
                        ? 'completed'
                        : i === currentStep - 1
                        ? 'active'
                        : ''
                    }`}
                    layout
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                  {i < 5 && (
                    <motion.div
                      className="w-6 h-px"
                      animate={{
                        backgroundColor: i < currentStep - 1
                          ? 'rgba(64, 145, 108, 0.3)'
                          : 'rgba(212, 175, 55, 0.08)',
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Edit-prior-step menu. Shows only steps that have data AND are
                structurally editable (not Muraqaba — that's a live timer). */}
            {(() => {
              const editable: Array<{ key: EditableStep; label: string; hasData: boolean }> = [
                { key: 'musharata', label: 'Musharata', hasData: !!session.musharata },
                { key: 'muhasaba', label: 'Muhasaba', hasData: !!session.muhasaba },
                { key: 'muaqaba', label: "Mu'aqaba", hasData: !!session.muaqaba },
                { key: 'mujahada', label: 'Mujahada', hasData: !!session.mujahada },
              ]
              const options = editable.filter(e => e.hasData)
              if (!options.length || editingStep) return null
              return (
                <div ref={editMenuRef} className="relative">
                  <motion.button
                    onClick={() => setEditMenuOpen(v => !v)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-gold hover:bg-gold/[0.05] transition-all"
                    whileTap={{ scale: 0.92 }}
                    aria-label="Edit a prior step"
                  >
                    <Pencil size={14} />
                  </motion.button>
                  <AnimatePresence>
                    {editMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute right-0 top-full mt-2 min-w-[180px] glass-card py-1 z-30"
                      >
                        <p className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-text-muted">
                          Edit a prior step
                        </p>
                        {options.map(o => (
                          <button
                            key={o.key}
                            onClick={() => {
                              setEditingStep(o.key)
                              setEditMenuOpen(false)
                            }}
                            className="w-full text-left px-3 py-1.5 text-sm text-text-secondary hover:text-gold hover:bg-gold/[0.04] transition-colors"
                          >
                            {o.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })()}
          </div>
        </div>
      </motion.header>

      {/* Step header — animated on step change */}
      <div className="px-8 pt-8 pb-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center space-y-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={editingStep ? `edit-${editingStep}` : currentStep}
              initial={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="space-y-1"
            >
              {(() => {
                // Map editingStep to the numeric step index (1-based).
                const editStepIdx = editingStep === 'musharata' ? 1
                  : editingStep === 'muhasaba' ? 3
                  : editingStep === 'muaqaba' ? 4
                  : editingStep === 'mujahada' ? 5
                  : null
                const displayStepIdx = editStepIdx ?? currentStep
                const stepMeta = STEPS[displayStepIdx - 1]
                return (
                  <>
                    <p
                      className="arabic text-gold text-2xl"
                      style={{ textShadow: '0 0 24px rgba(212, 175, 55, 0.18)' }}
                    >
                      {stepMeta.ar}
                    </p>
                    <h2 className="text-2xl font-light text-text-primary tracking-[-0.02em]">
                      {editingStep ? `${stepMeta.en} — editing` : stepMeta.en}
                    </h2>
                    <p className="text-text-muted text-xs tracking-wide mt-0.5">
                      {editingStep
                        ? `Update your ${stepMeta.en}`
                        : `Step ${currentStep} of 6 — ${stepMeta.subtitle}`}
                    </p>
                  </>
                )
              })()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Step content with animated transitions */}
      <div className="flex-1 px-6 pb-12 overflow-hidden relative z-10">
        <div className="max-w-2xl mx-auto w-full">
          <AnimatePresence mode="wait" custom={direction}>
            {editingStep ? (
              <motion.div
                key={`editing-${editingStep}`}
                initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
                transition={{ type: 'spring', stiffness: 200, damping: 26 }}
              >
                {editingStep === 'musharata' && (
                  <Musharata
                    session={session}
                    initialData={session.musharata}
                    submitLabel="Save changes"
                    onComplete={(data) => handleStepEdit('musharata', data)}
                    onCancel={() => setEditingStep(null)}
                  />
                )}
                {editingStep === 'muhasaba' && (
                  <Muhasaba
                    session={session}
                    initialData={session.muhasaba}
                    submitLabel="Save changes"
                    onComplete={(data) => handleStepEdit('muhasaba', data)}
                    onCancel={() => setEditingStep(null)}
                  />
                )}
                {editingStep === 'muaqaba' && (
                  <Muaqaba
                    session={session}
                    initialData={session.muaqaba}
                    submitLabel="Save changes"
                    onComplete={(data) => handleStepEdit('muaqaba', data)}
                    onCancel={() => setEditingStep(null)}
                  />
                )}
                {editingStep === 'mujahada' && (
                  <Mujahada
                    session={session}
                    initialData={session.mujahada}
                    submitLabel="Save changes"
                    onComplete={(data) => handleStepEdit('mujahada', data)}
                    onCancel={() => setEditingStep(null)}
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 26,
                  mass: 0.8,
                }}
              >
                {renderStep()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
