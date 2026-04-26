'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Pencil, ArrowRight, Check } from 'lucide-react'
import { GoldenParticles } from '@/components/GoldenParticles'
import { createClient } from '@/lib/supabase/client'
import type { Session, MuraqabaBlockResult, PrayerTimes } from '@/lib/types'

type Phase = 'briefing' | 'active' | 'between' | 'complete'

// Duration of a block in seconds. When end <= start, the block crosses
// midnight (e.g. 23:00 → 00:30 = 90 min); add 24h to end.
function durationSecs(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let diff = (eh * 60 + em) - (sh * 60 + sm)
  if (diff <= 0) diff += 24 * 60
  return Math.max(diff, 1) * 60
}

// Absolute ms of the next wall-clock instant matching `endHHMM`, given the
// block's `startHHMM`. If the block crosses midnight (end <= start), end is
// tomorrow's clock — never today's. Otherwise end is today's clock (which may
// already be in the past if the user is starting late).
function endOfBlockClockMs(startHHMM: string, endHHMM: string): number {
  const [sh, sm] = startHHMM.split(':').map(Number)
  const [eh, em] = endHHMM.split(':').map(Number)
  const d = new Date()
  d.setHours(eh, em, 0, 0)
  const crossesMidnight = (eh * 60 + em) <= (sh * 60 + sm)
  if (crossesMidnight) d.setDate(d.getDate() + 1)
  return d.getTime()
}

export function Muraqaba({
  session,
  onComplete,
  onEditMusharata,
}: {
  session: Session
  onComplete: (data: Record<string, unknown>) => void
  onEditMusharata?: () => void
}) {
  const musharata = session.musharata
  const isFullDay = musharata?.mode === 'full_day' && !!musharata.blocks?.length
  const blocks = useMemo(
    () => (isFullDay ? musharata!.blocks! : null),
    [isFullDay, musharata],
  )

  const [phase, setPhase] = useState<Phase>('briefing')
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0)
  const [driftCount, setDriftCount] = useState(0) // drifts in current block (or overall for time_block)
  const [driftKey, setDriftKey] = useState(0) // for ripple re-trigger
  const [blockResults, setBlockResults] = useState<MuraqabaBlockResult[]>([])
  // Drift notes — short annotations added after each drift tap.
  const [driftNotes, setDriftNotes] = useState<string[]>([])
  const [showDriftInput, setShowDriftInput] = useState(false)
  const driftInputRef = useRef<HTMLInputElement>(null)

  // Tasks the user opted to carry forward. Keyed by TARGET block index.
  // Each entry is a list of tasks copied from a past block into that future one.
  const [carriedTasks, setCarriedTasks] = useState<Record<number, Array<{ text: string; bucket?: string }>>>({})
  // One-shot flag set during restore so we don't fight the restored state
  // with the normal 'briefing/between → totalSeconds' reseed effect.
  const restoredRef = useRef(false)

  // Total drifts across all blocks (full-day) — time_block uses driftCount directly.
  const totalDriftCount = useMemo(
    () => blockResults.reduce((sum, b) => sum + b.drift_count, 0) + driftCount,
    [blockResults, driftCount],
  )

  // Current countdown duration: current block for full-day, whole time_block otherwise.
  const totalSeconds = useMemo(() => {
    if (blocks && blocks[currentBlockIndex]) {
      return durationSecs(blocks[currentBlockIndex].start, blocks[currentBlockIndex].end)
    }
    if (musharata) {
      return durationSecs(musharata.time_block_start, musharata.time_block_end)
    }
    return 60 * 60
  }, [blocks, currentBlockIndex, musharata])

  const [remaining, setRemaining] = useState(totalSeconds)
  // Total window the timer started with for THIS block — used as the progress-
  // ring denominator and for computing the minutes-worked on completion. Differs
  // from `totalSeconds` (the block's planned duration) when the user starts
  // early or late: the wall-clock target is fixed, so starting early gives a
  // longer window.
  const [startedWithSeconds, setStartedWithSeconds] = useState(totalSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Per-block start timestamp (full-day) or session start (time_block).
  const blockStartRef = useRef<string>('')
  // First block start (full-day) or session start (time_block) — used in final payload.
  const sessionStartRef = useRef<string>('')
  // Wall-clock target: absolute ms timestamp the timer should end at.
  // Source of truth — survives background-tab throttling of setInterval.
  const endTimeRef = useRef<number | null>(null)

  // Prayer times — for the "next prayer" indicator in active view.
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null)
  useEffect(() => {
    fetch('/api/prayer-times')
      .then(r => r.json())
      .then(d => setPrayerTimes(d.timings))
      .catch(() => { /* non-critical */ })
  }, [])

  // Compute next upcoming prayer relative to now. Recalculated whenever
  // remaining changes (every tick), but it's just string comparisons — cheap.
  const nextPrayer = useMemo(() => {
    if (!prayerTimes) return null
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const entries = Object.entries(prayerTimes) as [string, string][]
    for (const [name, time] of entries) {
      const [h, m] = time.split(':').map(Number)
      const tMin = h * 60 + m
      if (tMin > nowMin) {
        const diff = tMin - nowMin
        const hrs = Math.floor(diff / 60)
        const mins = diff % 60
        return { name, time, label: hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m` }
      }
    }
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prayerTimes, remaining])

  // Keep `remaining` in sync with `totalSeconds` whenever the current block changes
  // (and on initial mount). Skip the first run after a restore so the
  // restored timer isn't overwritten.
  useEffect(() => {
    if (restoredRef.current) {
      restoredRef.current = false
      return
    }
    if (phase === 'briefing' || phase === 'between') {
      setRemaining(totalSeconds)
      setStartedWithSeconds(totalSeconds)
    }
  }, [totalSeconds, phase])

  // ──── State persistence ────────────────────────────────────────────
  // Dual-write: localStorage (fast, same-device) + Supabase `muraqaba` column
  // with a `status: 'in_progress'` discriminator (cross-device). On completion
  // the column is overwritten with the final MuraqabaData payload (no status
  // field), which naturally clears the in-progress marker.
  const supabase = useMemo(() => createClient(), [])
  const storageKey = `muraqaba-state:${session.id}`

  // Debounced DB write — coalesce rapid state changes (drift taps, etc.).
  const dbSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestPayloadRef = useRef<Record<string, unknown> | null>(null)

  type PersistedState = {
    phase: Phase
    currentBlockIndex: number
    driftCount: number
    blockResults: MuraqabaBlockResult[]
    carriedTasks: Record<number, Array<{ text: string; bucket?: string }>>
    blockStart: string
    sessionStart: string
    endTime: number | null
    pauseRemaining: number | null
    isRunning: boolean
    startedWithSeconds?: number
  }

  const applyRestoredState = useCallback((s: PersistedState) => {
    restoredRef.current = true
    setPhase(s.phase)
    setCurrentBlockIndex(s.currentBlockIndex ?? 0)
    setDriftCount(s.driftCount ?? 0)
    setBlockResults(s.blockResults ?? [])
    setCarriedTasks(s.carriedTasks ?? {})
    setDriftNotes((s as Record<string, unknown>).driftNotes as string[] ?? [])
    blockStartRef.current = s.blockStart ?? ''
    sessionStartRef.current = s.sessionStart ?? ''
    if (s.startedWithSeconds != null) setStartedWithSeconds(s.startedWithSeconds)

    if (s.phase === 'active') {
      if (s.isRunning && s.endTime) {
        endTimeRef.current = s.endTime
        const msLeft = s.endTime - Date.now()
        setRemaining(Math.max(0, Math.ceil(msLeft / 1000)))
        setIsRunning(true)
      } else if (s.pauseRemaining != null) {
        setRemaining(s.pauseRemaining)
        setIsRunning(false)
      }
    }
  }, [])

  // Restore on mount. DB (cross-device) wins over localStorage (same-device).
  useEffect(() => {
    // Prefer DB state when it's flagged in-progress.
    const dbState = session.muraqaba as (Record<string, unknown> | null)
    if (dbState && dbState.status === 'in_progress') {
      applyRestoredState(dbState as unknown as PersistedState)
      return
    }
    // Fall back to localStorage for same-device refreshes when the DB hasn't
    // been written yet (first drift / phase change not yet debounced).
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return
    try {
      applyRestoredState(JSON.parse(raw) as PersistedState)
    } catch {
      window.localStorage.removeItem(storageKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save on every meaningful state change. Not on remaining-tick (noisy).
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (phase === 'briefing') {
      window.localStorage.removeItem(storageKey)
      return
    }
    const payload: Record<string, unknown> = {
      phase,
      currentBlockIndex,
      driftCount,
      driftNotes,
      blockResults,
      carriedTasks,
      blockStart: blockStartRef.current,
      sessionStart: sessionStartRef.current,
      endTime: isRunning ? endTimeRef.current : null,
      pauseRemaining: isRunning ? null : remaining,
      isRunning,
      startedWithSeconds,
      savedAt: Date.now(),
    }
    window.localStorage.setItem(storageKey, JSON.stringify(payload))

    // Debounced DB write (~500ms). Rapid drift taps coalesce into one update.
    latestPayloadRef.current = { ...payload, status: 'in_progress' }
    if (dbSaveTimerRef.current) clearTimeout(dbSaveTimerRef.current)
    dbSaveTimerRef.current = setTimeout(() => {
      if (!latestPayloadRef.current) return
      // Fire-and-forget — we don't block the UI on save latency. Errors are
      // silently dropped; localStorage still has the state on same device.
      void supabase
        .from('sessions')
        .update({ muraqaba: latestPayloadRef.current })
        .eq('id', session.id)
    }, 500)
    // Intentionally omit `remaining` from deps — we only snapshot it when
    // isRunning flips (pause). Polling ticks would thrash localStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentBlockIndex, driftCount, driftNotes, blockResults, carriedTasks, isRunning, startedWithSeconds, storageKey, supabase, session.id])

  // Flush any pending DB write on unmount so short-lived states don't get lost.
  useEffect(() => {
    return () => {
      if (dbSaveTimerRef.current) {
        clearTimeout(dbSaveTimerRef.current)
        if (latestPayloadRef.current) {
          void supabase
            .from('sessions')
            .update({ muraqaba: latestPayloadRef.current })
            .eq('id', session.id)
        }
      }
    }
  }, [supabase, session.id])

  const toggleCarry = useCallback((targetBlockIdx: number, task: { text: string; bucket?: string }) => {
    setCarriedTasks(prev => {
      const existing = prev[targetBlockIdx] ?? []
      const isAlready = existing.some(t => t.text === task.text)
      const next = {
        ...prev,
        [targetBlockIdx]: isAlready
          ? existing.filter(t => t.text !== task.text)
          : [...existing, task],
      }
      // Empty entries clean up so the map stays tidy.
      if (next[targetBlockIdx].length === 0) delete next[targetBlockIdx]
      return next
    })
  }, [])

  useEffect(() => {
    if (!isRunning) return

    const tick = () => {
      if (endTimeRef.current == null) return
      const msLeft = endTimeRef.current - Date.now()
      const secsLeft = Math.max(0, Math.ceil(msLeft / 1000))
      setRemaining(secsLeft)
      if (secsLeft <= 0) {
        setIsRunning(false)
        // Record and transition — useEffect runs after the setIsRunning(false)
        // commits, so we can safely call recordBlockEnd() from a handler instead.
      }
    }

    tick()
    intervalRef.current = setInterval(tick, 250)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isRunning])

  // When the timer hits 0, end the current block. Kept as an effect so we only
  // fire once even if setState batches oddly.
  useEffect(() => {
    if (phase === 'active' && !isRunning && remaining === 0) {
      endCurrentBlock()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isRunning, remaining])

  const startBlockTimer = useCallback(() => {
    const now = new Date()
    blockStartRef.current = now.toISOString()
    if (!sessionStartRef.current) sessionStartRef.current = blockStartRef.current

    // Clock-based target: the block's end time today (or, in time_block mode,
    // the session's chosen end time). Starting early gives a longer window,
    // starting late gives a shorter one — the anchor is the wall-clock target
    // (e.g., Maghrib), not a fixed duration from now. When end <= start the
    // block crosses midnight, so the target rolls to tomorrow.
    const endHHMM = blocks?.[currentBlockIndex]?.end ?? musharata?.time_block_end
    const startHHMM = blocks?.[currentBlockIndex]?.start ?? musharata?.time_block_start
    const target = endHHMM && startHHMM
      ? endOfBlockClockMs(startHHMM, endHHMM)
      : Date.now() + totalSeconds * 1000
    const actualRemaining = Math.max(1, Math.ceil((target - Date.now()) / 1000))

    endTimeRef.current = target
    setStartedWithSeconds(actualRemaining)
    setRemaining(actualRemaining)
    setIsRunning(true)
    setPhase('active')
  }, [blocks, currentBlockIndex, musharata, totalSeconds])

  const togglePause = () => {
    setIsRunning(prev => {
      if (prev) {
        if (endTimeRef.current != null) {
          const msLeft = endTimeRef.current - Date.now()
          setRemaining(Math.max(0, Math.ceil(msLeft / 1000)))
        }
        endTimeRef.current = null
      } else {
        endTimeRef.current = Date.now() + remaining * 1000
      }
      return !prev
    })
  }

  const handleDrift = () => {
    setDriftCount(prev => prev + 1)
    setDriftKey(prev => prev + 1)
    setShowDriftInput(true)
    setTimeout(() => driftInputRef.current?.focus(), 100)
  }

  const submitDriftNote = (note: string) => {
    if (note.trim()) {
      setDriftNotes(prev => [...prev, note.trim()])
    }
    setShowDriftInput(false)
  }

  // Record the just-finished block and move to 'between' (or 'complete' if last).
  const endCurrentBlock = useCallback(() => {
    setIsRunning(false)

    if (blocks) {
      const block = blocks[currentBlockIndex]
      const end = new Date().toISOString()
      const result: MuraqabaBlockResult = {
        label: block.label,
        drift_count: driftCount,
        drift_notes: driftNotes.length > 0 ? driftNotes : undefined,
        session_start: blockStartRef.current,
        session_end: end,
        duration_minutes: Math.round((startedWithSeconds - remaining) / 60),
      }
      setBlockResults(prev => [...prev, result])
      setDriftCount(0)
      setDriftNotes([])

      const isLast = currentBlockIndex >= blocks.length - 1
      if (isLast) {
        setPhase('complete')
      } else {
        setPhase('between')
      }
    } else {
      setPhase('complete')
    }
  }, [blocks, currentBlockIndex, driftCount, driftNotes, remaining, startedWithSeconds])

  const startNextBlock = useCallback(() => {
    setCurrentBlockIndex(i => i + 1)
    // The `remaining` sync effect resets the clock to the new block's duration
    // (phase is 'between' here). Then we kick off. Use a microtask so the effect
    // commits first.
    setTimeout(() => startBlockTimer(), 0)
  }, [startBlockTimer])

  const handleComplete = () => {
    const sessionEnd = new Date().toISOString()

    // Clear persisted in-progress state — final data lands on the session row.
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey)
    }

    if (blocks) {
      const totalMinutes = blockResults.reduce((sum, b) => sum + b.duration_minutes, 0)
      onComplete({
        mode: 'full_day',
        blocks: blockResults,
        drift_count: totalDriftCount,
        session_start: sessionStartRef.current,
        session_end: sessionEnd,
        duration_minutes: totalMinutes,
      })
    } else {
      onComplete({
        mode: 'time_block',
        drift_count: driftCount,
        drift_notes: driftNotes.length > 0 ? driftNotes : undefined,
        session_start: sessionStartRef.current,
        session_end: sessionEnd,
        duration_minutes: Math.round((startedWithSeconds - remaining) / 60),
      })
    }
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const progress = startedWithSeconds > 0 ? 1 - remaining / startedWithSeconds : 0
  const circumference = 2 * Math.PI * 140
  const strokeOffset = circumference * (1 - progress)
  const glowIntensity = 0.2 + progress * 0.4

  const currentBlock = blocks?.[currentBlockIndex]
  const originalCurrentBlockTasks = currentBlock
    ? musharata?.blocks?.find(b => b.label === currentBlock.label)?.tasks ?? []
    : []
  const carriedIntoCurrent = carriedTasks[currentBlockIndex] ?? []
  const tasksForCurrentBlock = [...originalCurrentBlockTasks, ...carriedIntoCurrent]

  // Total session minutes for complete screen
  const completionMinutes = blocks
    ? blockResults.reduce((sum, b) => sum + b.duration_minutes, 0)
    : Math.round((startedWithSeconds - remaining) / 60)
  const completionDrifts = blocks ? totalDriftCount : driftCount

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
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-text-primary text-sm font-medium">Your contract this session</h3>
                  {onEditMusharata && (
                    <motion.button
                      onClick={onEditMusharata}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border border-border-subtle text-text-muted hover:text-gold hover:border-gold/30 transition-all"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Pencil size={11} />
                      Edit
                    </motion.button>
                  )}
                </div>

                {blocks ? (
                  <div className="space-y-3">
                    {blocks.map((b, i) => {
                      const blockTasks = musharata.blocks?.find(x => x.label === b.label)?.tasks ?? []
                      return (
                        <motion.div
                          key={`block-brief-${i}`}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + i * 0.06 }}
                          className="border-l-2 border-gold/20 pl-3 space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <p className="text-text-primary font-medium">{b.label}</p>
                            <p className="text-text-muted tabular-nums">{b.start} — {b.end}</p>
                          </div>
                          <ul className="space-y-0.5">
                            {blockTasks.map((t, ti) => (
                              <li key={ti} className="text-text-secondary text-xs flex items-start gap-2">
                                <span className="text-gold-dim mt-0.5">·</span>
                                {t.text}
                                {t.bucket && (
                                  <span className="text-gold/60 text-[10px] uppercase tracking-wider ml-1">
                                    {t.bucket}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )
                    })}
                    <div className="flex gap-4 text-xs text-text-muted pt-2 border-t border-border-subtle">
                      <span>{blocks.length} blocks</span>
                      <span>
                        {Math.round(
                          blocks.reduce((sum, b) => sum + durationSecs(b.start, b.end) / 60, 0),
                        )} minutes total
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
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
              onClick={startBlockTimer}
              className="btn-gold w-full text-base flex items-center justify-center gap-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 22 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play size={18} />
              {blocks ? `Start "${blocks[0].label}"` : 'Start Session'}
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
            {blocks && currentBlock && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-1"
              >
                <p className="text-text-muted text-[11px] uppercase tracking-[0.15em]">
                  Block {currentBlockIndex + 1} of {blocks.length}
                </p>
                <p className="text-gold text-sm font-medium">{currentBlock.label}</p>
              </motion.div>
            )}

            {/* Tasks for current block */}
            {blocks && tasksForCurrentBlock.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card px-4 py-3 space-y-1 w-full max-w-sm"
              >
                {tasksForCurrentBlock.map((t, i) => (
                  <li key={i} className="text-text-secondary text-xs flex items-start gap-2">
                    <span className="text-gold-dim mt-0.5">·</span>
                    {t.text}
                  </li>
                ))}
              </motion.ul>
            )}

            {/* Timer circle with breathing glow */}
            <div className="relative w-[260px] h-[260px]">
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
                  {nextPrayer && isRunning && (
                    <span className="text-gold/50 ml-2">· {nextPrayer.name} in {nextPrayer.label}</span>
                  )}
                </motion.p>
              </div>
            </div>

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
                    {driftCount} {driftCount === 1 ? 'time' : 'times'} this block
                    {blocks && totalDriftCount > driftCount && (
                      <span className="text-text-muted/60"> · {totalDriftCount} total</span>
                    )}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Drift note input — slides in after each drift tap */}
            <AnimatePresence>
              {showDriftInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  className="w-full max-w-sm"
                >
                  <input
                    ref={driftInputRef}
                    type="text"
                    placeholder="What pulled you? (optional, Enter to skip)"
                    className="input-dark w-full text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        submitDriftNote((e.target as HTMLInputElement).value)
                      }
                    }}
                    onBlur={(e) => submitDriftNote(e.target.value)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

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

            <motion.button
              onClick={endCurrentBlock}
              className="text-text-muted text-xs hover:text-text-secondary"
              whileHover={{ opacity: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {blocks ? 'Finish this block early' : 'Finish session early'}
            </motion.button>
          </motion.div>
        )}

        {phase === 'between' && blocks && (() => {
          const justFinishedIndex = currentBlockIndex
          const justFinishedBlock = blocks[justFinishedIndex]
          const justFinishedTasks = musharata?.blocks
            ?.find(b => b.label === justFinishedBlock.label)?.tasks ?? []
          const nextIndex = justFinishedIndex + 1
          const nextBlock = blocks[nextIndex]
          const nextOriginalTasks = musharata?.blocks
            ?.find(b => b.label === nextBlock?.label)?.tasks ?? []
          const nextCarried = carriedTasks[nextIndex] ?? []

          return (
          <motion.div
            key={`between-${currentBlockIndex}`}
            initial={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            className="space-y-5 pt-6"
          >
            <div className="space-y-2 text-center">
              <p className="text-text-muted text-[11px] uppercase tracking-[0.15em]">
                Block {justFinishedIndex + 1} of {blocks.length} complete
              </p>
              <h3 className="text-xl text-text-primary font-light">
                {justFinishedBlock.label}
              </h3>
              {blockResults[blockResults.length - 1] && (
                <p className="text-text-secondary text-sm">
                  {blockResults[blockResults.length - 1].duration_minutes} min ·{' '}
                  {blockResults[blockResults.length - 1].drift_count} drifts
                </p>
              )}
            </div>

            {/* Past blocks rollup (collapsed summary). Hidden on the first transition
                since there's nothing meaningful yet beyond the just-finished one. */}
            {blockResults.length > 1 && (
              <motion.details
                className="glass-card p-3 text-left"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <summary className="text-text-muted text-[11px] uppercase tracking-[0.15em] cursor-pointer hover:text-text-secondary">
                  Past blocks ({blockResults.length})
                </summary>
                <div className="mt-2 space-y-1">
                  {blockResults.map((b, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-text-secondary">{b.label}</span>
                      <span className="text-text-muted tabular-nums">
                        {b.duration_minutes}m · {b.drift_count} drifts
                      </span>
                    </div>
                  ))}
                </div>
              </motion.details>
            )}

            {/* Carry-forward picker: tap any task from the just-finished block
                to push it into the next block's list. */}
            {nextBlock && justFinishedTasks.length > 0 && (
              <motion.div
                className="glass-card p-4 space-y-2 text-left"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div>
                  <p className="text-text-muted text-[11px] uppercase tracking-[0.15em]">
                    From &ldquo;{justFinishedBlock.label}&rdquo;
                  </p>
                  <p className="text-text-muted text-[11px] mt-0.5">
                    Tap to carry a task into the next block.
                  </p>
                </div>
                <ul className="space-y-1">
                  {justFinishedTasks.map((t, i) => {
                    const isCarried = nextCarried.some(c => c.text === t.text)
                    return (
                      <li key={i}>
                        <button
                          onClick={() => toggleCarry(nextIndex, t)}
                          className={`w-full flex items-start gap-2 text-xs text-left p-2 rounded-lg border transition-all ${
                            isCarried
                              ? 'border-gold/40 bg-gold/[0.06] text-gold'
                              : 'border-transparent text-text-secondary hover:border-border-subtle hover:text-text-primary'
                          }`}
                        >
                          <span className="mt-0.5 shrink-0">
                            {isCarried ? <Check size={12} /> : <ArrowRight size={12} className="opacity-40" />}
                          </span>
                          <span className="flex-1">{t.text}</span>
                          {t.bucket && (
                            <span className={`text-[10px] uppercase tracking-wider ${isCarried ? 'text-gold/70' : 'text-text-muted'}`}>
                              {t.bucket}
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </motion.div>
            )}

            {/* Up next preview — now includes carried tasks */}
            {nextBlock && (
              <motion.div
                className="glass-card p-4 space-y-3 text-left"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-text-muted text-[11px] uppercase tracking-[0.15em]">Up next</p>
                  <p className="text-text-muted text-xs tabular-nums">
                    {nextBlock.start} — {nextBlock.end}
                  </p>
                </div>
                <p className="text-gold text-sm font-medium">{nextBlock.label}</p>
                <ul className="space-y-0.5">
                  {nextOriginalTasks.map((t, i) => (
                    <li key={`orig-${i}`} className="text-text-secondary text-xs flex items-start gap-2">
                      <span className="text-gold-dim mt-0.5">·</span>
                      {t.text}
                    </li>
                  ))}
                  {nextCarried.map((t, i) => (
                    <li key={`carry-${i}`} className="text-gold text-xs flex items-start gap-2">
                      <ArrowRight size={11} className="mt-0.5 shrink-0 opacity-70" />
                      <span className="flex-1">{t.text}</span>
                      <button
                        onClick={() => toggleCarry(nextIndex, t)}
                        className="text-text-muted hover:text-text-secondary text-[10px]"
                      >
                        remove
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            <div className="flex flex-col items-center gap-2 pt-2">
              <motion.button
                onClick={startNextBlock}
                className="btn-gold inline-flex items-center gap-2"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Play size={16} />
                Start next block
              </motion.button>
              <motion.button
                onClick={() => setPhase('complete')}
                className="text-text-muted text-xs hover:text-text-secondary"
                whileHover={{ opacity: 0.8 }}
              >
                Finish session here
              </motion.button>
            </div>
          </motion.div>
          )
        })()}

        {phase === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 150, damping: 20 }}
            className="space-y-6 text-center pt-12 relative"
          >
            <div className="absolute inset-0 -top-20 overflow-hidden pointer-events-none">
              <GoldenParticles count={32} speed={0.8} />
            </div>

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
                {completionMinutes} minutes of focused work.
                {completionDrifts === 0
                  ? ' No drifts recorded — unwavering focus.'
                  : completionDrifts <= 2
                  ? ` You drifted ${completionDrifts} ${completionDrifts === 1 ? 'time' : 'times'} — and returned each time. That is muraqaba.`
                  : ` You drifted ${completionDrifts} times — and came back ${completionDrifts} times. The return is what matters.`}
              </motion.p>
            </motion.div>

            {blocks && blockResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="glass-card p-4 space-y-2 max-w-md mx-auto text-left relative z-10"
              >
                <p className="text-text-muted text-[11px] uppercase tracking-[0.15em]">Per block</p>
                {blockResults.map((b, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-text-secondary">{b.label}</span>
                    <span className="text-text-muted tabular-nums">
                      {b.duration_minutes}m · {b.drift_count} drifts
                    </span>
                  </div>
                ))}
              </motion.div>
            )}

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
