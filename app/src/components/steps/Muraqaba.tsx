'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause } from 'lucide-react'
import { GoldenParticles } from '@/components/GoldenParticles'
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
  const [driftKey, setDriftKey] = useState(0) // for ripple re-trigger

  const totalSeconds = musharata
    ? (() => {
        const [sh, sm] = musharata.time_block_start.split(':').map(Number)
        const [eh, em] = musharata.time_block_end.split(':').map(Number)
        const diff = (eh * 60 + em) - (sh * 60 + sm)
        return Math.max(diff, 1) * 60
      })()
    : 60 * 60

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

  const handleDrift = () => {
    setDriftCount(prev => prev + 1)
    setDriftKey(prev => prev + 1)
  }

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

  // Timer ring glow intensifies with progress
  const glowIntensity = 0.2 + progress * 0.4

  return (
    <div className="pt-4">
      <AnimatePresence mode="wait">
        {phase === 'briefing' && (
          <motion.div
            key="briefing"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
            className="space-y-8"
          >
            {musharata && (
              <motion.div
                className="glass-card p-5 space-y-3"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 22 }}
              >
                <h3 className="text-text-primary text-sm font-medium">Your contract this session</h3>
                <ul className="space-y-2">
                  {musharata.tasks.map((task, i) => (
                    <motion.li
                      key={i}
                      className="text-text-secondary text-sm flex items-start gap-2"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.06 }}
                    >
                      <span className="text-gold mt-0.5">&#x2022;</span>
                      {task.text}
                    </motion.li>
                  ))}
                </ul>
                <div className="flex gap-4 text-xs text-text-muted pt-2 border-t border-border-subtle">
                  <span>{musharata.time_block_start} — {musharata.time_block_end}</span>
                  <span>{Math.round(totalSeconds / 60)} minutes</span>
                </div>
              </motion.div>
            )}

            <motion.div
              className="glass-card p-5 space-y-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 22 }}
            >
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
            </motion.div>

            <motion.button
              onClick={startSession}
              className="btn-gold w-full text-base flex items-center justify-center gap-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 22 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play size={18} />
              Start Session
            </motion.button>
          </motion.div>
        )}

        {phase === 'active' && (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 150, damping: 22 }}
            className="flex flex-col items-center space-y-6 pt-4"
          >
            {/* Timer circle with breathing glow */}
            <div className="relative w-[260px] h-[260px]">
              {/* Ambient glow behind timer */}
              <motion.div
                className="timer-glow"
                animate={{ opacity: glowIntensity }}
                transition={{ duration: 2 }}
              />

              <svg viewBox="0 0 320 320" className="w-full h-full transform -rotate-90">
                <circle
                  cx="160" cy="160" r="140"
                  fill="none" strokeWidth="2"
                  className="timer-ring-bg"
                />
                <motion.circle
                  cx="160" cy="160" r="140"
                  fill="none" strokeWidth="3"
                  className="timer-ring"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  style={{
                    filter: `drop-shadow(0 0 ${8 + progress * 16}px rgba(212, 175, 55, ${0.2 + progress * 0.3}))`,
                  }}
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={`${minutes}-${seconds}`}
                    initial={{ opacity: 0.5, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl font-light text-text-primary tracking-wider tabular-nums"
                  >
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </motion.p>
                </AnimatePresence>
                <motion.p
                  className="text-text-muted text-xs mt-2"
                  animate={{ opacity: isRunning ? 0.6 : 1 }}
                >
                  {isRunning ? 'in focus' : 'paused'}
                </motion.p>
              </div>
            </div>

            {/* Controls */}
            <motion.button
              onClick={togglePause}
              className="btn-ghost flex items-center gap-2"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={isRunning ? 'pause' : 'play'}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2"
                >
                  {isRunning ? <Pause size={16} /> : <Play size={16} />}
                  {isRunning ? 'Pause' : 'Resume'}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            {/* Drift counter with ripple */}
            <motion.button
              key={driftKey}
              onClick={handleDrift}
              className="glass-card px-6 py-3 text-center cursor-pointer"
              whileHover={{ scale: 1.03, borderColor: 'rgba(212, 175, 55, 0.15)' }}
              whileTap={{ scale: 0.97 }}
              animate={driftKey > 0 ? {
                boxShadow: [
                  '0 0 0 0 rgba(212, 175, 55, 0.2)',
                  '0 0 0 16px rgba(212, 175, 55, 0)',
                ],
              } : {}}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-text-secondary text-sm">I drifted</p>
              <AnimatePresence>
                {driftCount > 0 && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-text-muted text-xs mt-1"
                  >
                    {driftCount} {driftCount === 1 ? 'time' : 'times'} — just data, not shame
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Dhikr reminder — breathing */}
            <motion.p
              className="arabic text-gold/30 text-sm text-center"
              animate={{
                opacity: [0.3, 0.7, 0.3],
                scale: [1, 1.03, 1],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{ textShadow: '0 0 20px rgba(212, 175, 55, 0.15)' }}
            >
              لا حول ولا قوة إلا بالله
            </motion.p>

            {/* Finish early */}
            <motion.button
              onClick={handleFinishEarly}
              className="text-text-muted text-xs hover:text-text-secondary"
              whileHover={{ opacity: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              Finish session early
            </motion.button>
          </motion.div>
        )}

        {phase === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 150, damping: 20 }}
            className="space-y-6 text-center pt-12 relative"
          >
            {/* Golden particles — the transcendent moment */}
            <div className="absolute inset-0 -top-20 overflow-hidden pointer-events-none">
              <GoldenParticles count={32} speed={0.8} />
            </div>

            {/* Radiant backdrop */}
            <motion.div
              className="absolute top-8 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full pointer-events-none"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: 'radial-gradient(circle, rgba(212, 175, 55, 0.06) 0%, transparent 65%)',
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 150, damping: 18, delay: 0.1 }}
              className="space-y-3 relative z-10"
            >
              <motion.p
                className="arabic text-gold text-3xl"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{ textShadow: '0 0 40px rgba(212, 175, 55, 0.4)' }}
              >
                ما شاء الله
              </motion.p>
              <motion.h3
                className="text-xl text-text-primary font-light"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Session Complete
              </motion.h3>
              <motion.p
                className="text-text-secondary text-sm max-w-sm mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {Math.round((totalSeconds - remaining) / 60)} minutes of focused work.
                {driftCount === 0
                  ? ' No drifts recorded — unwavering focus.'
                  : driftCount <= 2
                  ? ` You drifted ${driftCount} ${driftCount === 1 ? 'time' : 'times'} — and returned each time. That is muraqaba.`
                  : ` You drifted ${driftCount} times — and came back ${driftCount} times. The return is what matters.`}
              </motion.p>
            </motion.div>

            <motion.button
              onClick={handleComplete}
              className="btn-gold relative z-10"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, type: 'spring', stiffness: 200, damping: 22 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Continue to Self-Accounting
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
