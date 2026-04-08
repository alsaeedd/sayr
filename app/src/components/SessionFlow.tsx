'use client'

import { useState, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

import type { Session } from '@/lib/types'
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

export function SessionFlow({ session: initialSession }: { session: Session }) {
  const [session, setSession] = useState(initialSession)
  const [direction, setDirection] = useState(1)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const currentStep = session.current_step

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
        updatePayload.status = 'completed'
        updatePayload.completed_at = new Date().toISOString()
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
  }, [currentStep, session.id, supabase, router])

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
        return <Muraqaba session={session} onComplete={(data) => saveAndAdvance(data, 'muraqaba')} />
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
        </div>
      </motion.header>

      {/* Step header — animated on step change */}
      <div className="px-8 pt-8 pb-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center space-y-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="space-y-1"
            >
              <p
                className="arabic text-gold text-2xl"
                style={{ textShadow: '0 0 24px rgba(212, 175, 55, 0.18)' }}
              >
                {STEPS[currentStep - 1].ar}
              </p>
              <h2 className="text-2xl font-light text-text-primary tracking-[-0.02em]">
                {STEPS[currentStep - 1].en}
              </h2>
              <p className="text-text-muted text-xs tracking-wide mt-0.5">
                Step {currentStep} of 6 — {STEPS[currentStep - 1].subtitle}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Step content with animated transitions */}
      <div className="flex-1 px-6 pb-12 overflow-hidden relative z-10">
        <div className="max-w-2xl mx-auto w-full">
          <AnimatePresence mode="wait" custom={direction}>
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
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
