'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
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
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
}

export function SessionFlow({ session: initialSession }: { session: Session }) {
  const [session, setSession] = useState(initialSession)
  const [direction, setDirection] = useState(1)
  const router = useRouter()
  const supabase = createClient()

  const currentStep = session.current_step

  const saveAndAdvance = useCallback(async (stepData: Record<string, unknown>, stepKey: string) => {
    const nextStep = currentStep + 1

    const updatePayload: Record<string, unknown> = {
      [stepKey]: stepData,
      current_step: nextStep > 6 ? 6 : nextStep,
    }

    if (nextStep > 6) {
      updatePayload.status = 'completed'
      updatePayload.completed_at = new Date().toISOString()
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

  const startNewSession = useCallback(async () => {
    const { data } = await supabase
      .from('sessions')
      .insert({ user_id: session.user_id, current_step: 1, status: 'active' })
      .select()
      .single()

    if (data) {
      router.push(`/session/${data.id}`)
    }
  }, [supabase, session.user_id, router])

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Musharata session={session} onComplete={(data) => saveAndAdvance(data, 'musharata')} />
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
      {/* Top bar with step indicators */}
      <header className="px-8 py-5 border-b border-border-subtle">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="arabic text-gold text-sm">سَيْر</span>
            <span className="text-text-muted text-xs">|</span>
            <span className="text-text-secondary text-xs">Work Session</span>
          </div>
          <div className="flex items-center gap-2">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`step-dot ${
                    i < currentStep - 1
                      ? 'completed'
                      : i === currentStep - 1
                      ? 'active'
                      : ''
                  }`}
                />
                {i < 5 && (
                  <div
                    className={`w-6 h-px ${
                      i < currentStep - 1 ? 'bg-emerald-light/30' : 'bg-border-subtle'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Step header */}
      <div className="px-8 pt-8 pb-4">
        <div className="max-w-2xl mx-auto text-center space-y-1">
          <motion.p
            key={`ar-${currentStep}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="arabic text-gold text-2xl"
          >
            {STEPS[currentStep - 1].ar}
          </motion.p>
          <motion.h2
            key={`en-${currentStep}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-light text-text-primary"
          >
            {STEPS[currentStep - 1].en}
          </motion.h2>
          <motion.p
            key={`sub-${currentStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-text-secondary text-sm"
          >
            Step {currentStep} of 6 — {STEPS[currentStep - 1].subtitle}
          </motion.p>
        </div>
      </div>

      {/* Step content with animation */}
      <div className="flex-1 px-6 pb-12 overflow-hidden">
        <div className="max-w-2xl mx-auto w-full">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
