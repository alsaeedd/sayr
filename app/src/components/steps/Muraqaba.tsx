'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw } from 'lucide-react'
import type { Session } from '@/lib/types'

type Phase = 'briefing' | 'active' | 'complete'

export function Muraqaba({
  session,
  onComplete,
}: {
  session: Session
  onComplete: (data: Record<string, unknown>) => void
}) {
  const musharata = session.musharata
  const [phase, setPhase] = useState<Phase>('briefing')
  const [driftCount, setDriftCount] = useState(0)

  // Timer state
  const totalSeconds = musharata
    ? (() => {
        const [sh, sm] = musharata.time_block_start.split(':').map(Number)
        const [eh, em] = musharata.time_block_end.split(':').map(Number)
        const diff = (eh * 60 + em) - (sh * 60 + sm)
        return Math.max(diff, 1) * 60
      })()
    : 60 * 60 // 1 hour default

  const [remaining, setRemaining] = useState(totalSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<string>('')

  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            setIsRunning(false)
            setPhase('complete')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, remaining])

  const startSession = () => {
    startTimeRef.current = new Date().toISOString()
    setIsRunning(true)
    setPhase('active')
  }

  const togglePause = () => setIsRunning(prev => !prev)

  const handleDrift = () => setDriftCount(prev => prev + 1)

  const handleFinishEarly = useCallback(() => {
    setIsRunning(false)
    setPhase('complete')
  }, [])

  const handleComplete = () => {
    onComplete({
      drift_count: driftCount,
      session_start: startTimeRef.current,
      session_end: new Date().toISOString(),
      duration_minutes: Math.round((totalSeconds - remaining) / 60),
    })
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const progress = 1 - remaining / totalSeconds
  const circumference = 2 * Math.PI * 140
  const strokeOffset = circumference * (1 - progress)

  return (
    <div className="pt-4">
      <AnimatePresence mode="wait">
        {phase === 'briefing' && (
          <motion.div
            key="briefing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* What you'll do */}
            {musharata && (
              <div className="glass-card p-5 space-y-3">
                <h3 className="text-text-primary text-sm font-medium">Your contract this session</h3>
                <ul className="space-y-2">
                  {musharata.tasks.map((task, i) => (
                    <li key={i} className="text-text-secondary text-sm flex items-start gap-2">
                      <span className="text-gold mt-0.5">&#x2022;</span>
                      {task.text}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-4 text-xs text-text-muted pt-2 border-t border-border-subtle">
                  <span>{musharata.time_block_start} — {musharata.time_block_end}</span>
                  <span>{Math.round(totalSeconds / 60)} minutes</span>
                </div>
              </div>
            )}

            {/* Muraqaba guidance */}
            <div className="glass-card p-5 space-y-3">
              <h3 className="text-text-primary text-sm font-medium">How to practice Muraqaba</h3>
              <div className="space-y-2 text-text-secondary text-sm leading-relaxed">
                <p>
                  Muraqaba is gentle watchfulness — not obsessive control. You are the rider,
                  your nafs is the horse. Keep a steady hand.
                </p>
                <p>
                  When you drift — and you will — don&apos;t spiral into guilt. Simply notice,
                  say <span className="arabic text-gold text-xs mx-1">لا حول ولا قوة إلا بالله</span> and return.
                </p>
                <p className="text-text-muted text-xs">
                  Tap &ldquo;I drifted&rdquo; each time you catch yourself. This is data, not shame.
                </p>
              </div>
            </div>

            <button onClick={startSession} className="btn-gold w-full text-base flex items-center justify-center gap-2">
              <Play size={18} />
              Start Session
            </button>
          </motion.div>
        )}

        {phase === 'active' && (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center space-y-8 pt-8"
          >
            {/* Timer circle */}
            <div className="relative">
              <svg width="320" height="320" viewBox="0 0 320 320" className="transform -rotate-90">
                <circle
                  cx="160"
                  cy="160"
                  r="140"
                  fill="none"
                  strokeWidth="3"
                  className="timer-ring-bg"
                />
                <circle
                  cx="160"
                  cy="160"
                  r="140"
                  fill="none"
                  strokeWidth="3"
                  className="timer-ring"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-5xl font-light text-text-primary tracking-wider tabular-nums">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </p>
                <p className="text-text-muted text-xs mt-2">
                  {isRunning ? 'in focus' : 'paused'}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={togglePause}
                className="btn-ghost flex items-center gap-2"
              >
                {isRunning ? <Pause size={16} /> : <Play size={16} />}
                {isRunning ? 'Pause' : 'Resume'}
              </button>
            </div>

            {/* Drift counter */}
            <button
              onClick={handleDrift}
              className="glass-card px-6 py-3 text-center hover:border-gold/20 transition-all cursor-pointer"
            >
              <p className="text-text-secondary text-sm">I drifted</p>
              {driftCount > 0 && (
                <p className="text-text-muted text-xs mt-1">
                  {driftCount} {driftCount === 1 ? 'time' : 'times'} — just data, not shame
                </p>
              )}
            </button>

            {/* Dhikr reminder */}
            <motion.p
              className="arabic text-gold/40 text-sm text-center breathe"
            >
              لا حول ولا قوة إلا بالله
            </motion.p>

            {/* Finish early */}
            <button
              onClick={handleFinishEarly}
              className="text-text-muted text-xs hover:text-text-secondary transition-colors"
            >
              Finish session early
            </button>
          </motion.div>
        )}

        {phase === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 text-center pt-8"
          >
            <div className="space-y-2">
              <p className="arabic text-gold text-2xl">ما شاء الله</p>
              <h3 className="text-xl text-text-primary font-light">Session Complete</h3>
              <p className="text-text-secondary text-sm">
                {Math.round((totalSeconds - remaining) / 60)} minutes of focused work.
                {driftCount > 0
                  ? ` You drifted ${driftCount} ${driftCount === 1 ? 'time' : 'times'} — and came back each time.`
                  : ' No drifts recorded — strong focus.'}
              </p>
            </div>

            <button onClick={handleComplete} className="btn-gold text-base">
              Continue to Self-Accounting
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
