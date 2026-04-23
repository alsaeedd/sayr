'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Clock, Layers, Sparkles, ArrowDownCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Session, PrayerTimes, MusharataData } from '@/lib/types'

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 180, damping: 22 },
  },
}

const itemEnter = {
  initial: { opacity: 0, height: 0, y: -8 },
  animate: {
    opacity: 1,
    height: 'auto',
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 28 },
  },
  exit: {
    opacity: 0,
    height: 0,
    y: -8,
    transition: { duration: 0.2, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] },
  },
}

function getNowTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

type BlockDraft = {
  label: string
  start: string
  end: string
  tasks: string[]
  // Parallel to `tasks`: bucket per task ('' = unassigned).
  taskBuckets: string[]
}

export type MusharataCarryForward = {
  change_for_tomorrow: string
  carry_tasks: Array<{ text: string; bucket?: string }>
  previous_completed_at: string | null
}

export type MusharataUnfinishedHint = {
  previous_tasks: Array<{ text: string; bucket?: string }>
  completed_count: number
  total_count: number
}

export function Musharata({
  session,
  mode: modeProp,
  initialData,
  submitLabel = 'Begin Session',
  onComplete,
  onCancel,
  carryForward,
  unfinishedHint,
  taskPool,
}: {
  session: Session
  mode?: 'time_block' | 'full_day'
  initialData?: MusharataData | null
  submitLabel?: string
  onComplete: (data: Record<string, unknown>) => void
  onCancel?: () => void
  carryForward?: MusharataCarryForward | null
  unfinishedHint?: MusharataUnfinishedHint | null
  taskPool?: Array<{ text: string; bucket?: string }>
}) {
  // Mode: explicit prop wins, else inferred from initialData, else time_block.
  const mode: 'time_block' | 'full_day' =
    modeProp ?? (initialData?.mode === 'full_day' ? 'full_day' : 'time_block')

  const supabase = useMemo(() => createClient(), [])

  // Seed state from initialData when editing; empty defaults when creating.
  const seedTaskList = initialData?.tasks.map(t => t.text) ?? ['']
  const seedTaskBuckets = initialData?.tasks.map(t => t.bucket || '') ?? ['']
  const seedTaskFromPool = initialData?.tasks.map(t => t.from_pool || '') ?? ['']
  const seedAvoidances = initialData?.avoidances.length
    ? [...initialData.avoidances, '']
    : ['']
  const seedBoundaries = initialData?.boundaries.length
    ? [...initialData.boundaries, '']
    : ['']
  const seedUseBuckets = !!initialData?.tasks.some(t => t.bucket)

  const [tasks, setTasks] = useState<string[]>(seedTaskList)
  // Parallel to `tasks`: the bucket assigned to each task (empty string = none).
  const [taskBuckets, setTaskBuckets] = useState<string[]>(seedTaskBuckets)
  // Parallel: origin pool text ('' = not from pool). Used to purge pool entries
  // when the task is marked done in Muhasaba. Preserves origin across text edits.
  const [taskFromPool, setTaskFromPool] = useState<string[]>(seedTaskFromPool)
  const [avoidances, setAvoidances] = useState<string[]>(seedAvoidances)
  const [boundaries, setBoundaries] = useState<string[]>(seedBoundaries)
  const [buckets, setBuckets] = useState<string[]>([])
  const [useBuckets, setUseBuckets] = useState(seedUseBuckets)
  // Dismissal flags for the carry-forward / unfinished banners. One-shot per mount.
  const [carryDismissed, setCarryDismissed] = useState(false)
  const [unfinishedDismissed, setUnfinishedDismissed] = useState(false)
  const [presetsLoaded, setPresetsLoaded] = useState(false)
  const [timeBlockStart, setTimeBlockStart] = useState(initialData?.time_block_start ?? '')
  const [timeBlockEnd, setTimeBlockEnd] = useState(initialData?.time_block_end ?? '')
  const [timeError, setTimeError] = useState('')
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null)
  const [duaRecited, setDuaRecited] = useState(initialData?.dua_recited ?? false)
  const [selectedPrayer, setSelectedPrayer] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Full-day mode: schedule of blocks, each with its own task list.
  // One block at start; user can add/remove and auto-fill from prayer times.
  const seedBlocks: BlockDraft[] = initialData?.blocks?.length
    ? initialData.blocks.map(b => ({
        label: b.label,
        start: b.start,
        end: b.end,
        tasks: b.tasks.length ? b.tasks.map(t => t.text) : [''],
        taskBuckets: b.tasks.length ? b.tasks.map(t => t.bucket || '') : [''],
      }))
    : [{ label: '', start: '', end: '', tasks: [''], taskBuckets: [''] }]
  const [blocks, setBlocks] = useState<BlockDraft[]>(seedBlocks)

  // Refs for focusing next input on Enter
  const taskRefs = useRef<(HTMLInputElement | null)[]>([])
  const avoidRefs = useRef<(HTMLInputElement | null)[]>([])
  const boundaryRefs = useRef<(HTMLInputElement | null)[]>([])
  const startTimeRef = useRef<HTMLInputElement | null>(null)
  // Full-day mode: 2D ref grid [blockIndex][taskIndex].
  const blockTaskRefs = useRef<HTMLInputElement[][]>([])

  // Load user presets on mount
  useEffect(() => {
    const loadPresets = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('presets, prayer_method')
        .eq('id', session.user_id)
        .single()

      if (data?.presets && !presetsLoaded) {
        const p = data.presets as { avoidances?: string[]; boundaries?: string[]; buckets?: string[] }
        if (p.avoidances?.length) setAvoidances([...p.avoidances, ''])
        if (p.boundaries?.length) setBoundaries([...p.boundaries, ''])
        if (p.buckets?.length) setBuckets(p.buckets)
        setPresetsLoaded(true)
      }
    }
    loadPresets()
  }, [supabase, session.user_id, presetsLoaded])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords
          setUserLocation({ lat, lng })
          const res = await fetch(`/api/prayer-times?lat=${lat}&lng=${lng}`)
          const data = await res.json()
          setPrayerTimes(data.timings)
        },
        async () => {
          const res = await fetch('/api/prayer-times')
          const data = await res.json()
          setPrayerTimes(data.timings)
        }
      )
    }
  }, [])

  // Time validation
  useEffect(() => {
    if (timeBlockStart && timeBlockEnd) {
      const [sh, sm] = timeBlockStart.split(':').map(Number)
      const [eh, em] = timeBlockEnd.split(':').map(Number)
      const startMin = sh * 60 + sm
      const endMin = eh * 60 + em
      if (endMin <= startMin) {
        setTimeError('End time must be after start time')
      } else {
        setTimeError('')
      }
    } else {
      setTimeError('')
    }
  }, [timeBlockStart, timeBlockEnd])

  const addItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, ''])
  }

  const updateItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string
  ) => {
    setter(prev => prev.map((item, i) => (i === index ? value : item)))
  }

  const removeItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) => {
    setter(prev => prev.filter((_, i) => i !== index))
  }

  // Enter advances focus: next row if one exists, else append+focus if current
  // has text, else jump to the next section's first input (so an empty last
  // row lets you escape the list without reaching for the mouse).
  const handleListKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    items: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    index: number,
    onExit?: () => void,
  ) => {
    if (e.key !== 'Enter') return
    e.preventDefault()

    const hasNext = index < items.length - 1
    if (hasNext) {
      refs.current[index + 1]?.focus()
      return
    }

    if (items[index].trim()) {
      setter(prev => [...prev, ''])
      setTimeout(() => refs.current[index + 1]?.focus(), 50)
      return
    }

    // Empty last row → advance to next section.
    onExit?.()
  }, [])

  // Exit callbacks for list Enter-key navigation. Wrapped in useCallback so
  // the lint rule that flags ref access can see they're memoized event handlers,
  // not ref reads during render.
  const focusBoundaryFirst = useCallback(() => {
    boundaryRefs.current[0]?.focus()
  }, [])
  const focusStartTime = useCallback(() => {
    startTimeRef.current?.focus()
  }, [])

  // ──── Carry-forward helpers ───────────────────────────────────────
  // Append a string to a list of strings, collapsing the stale trailing empty.
  const appendToStringList = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    item: string,
  ) => {
    setter(prev => {
      const trimmed = prev.filter(x => x.trim())
      return [...trimmed, item, '']
    })
  }

  const applyChangeToAvoidances = () => {
    const text = carryForward?.change_for_tomorrow?.trim()
    if (!text) return
    appendToStringList(setAvoidances, text)
    setCarryDismissed(true)
  }
  const applyChangeToBoundaries = () => {
    const text = carryForward?.change_for_tomorrow?.trim()
    if (!text) return
    appendToStringList(setBoundaries, text)
    setCarryDismissed(true)
  }

  // `markAsFromPool`: when pulling from the task pool we stamp each added task
  // with its original pool text so Muhasaba can purge completed pool entries.
  const pullTaskList = (
    tasksToPull: Array<{ text: string; bucket?: string }>,
    markAsFromPool = false,
  ) => {
    if (!tasksToPull.length) return
    const originFor = (t: { text: string }) => (markAsFromPool ? t.text : '')

    if (mode === 'time_block') {
      // Capture the currently-filled indices so we trim the stale trailing
      // empty slot before appending.
      const filledIndices = tasks.map((t, i) => (t.trim() ? i : -1)).filter(i => i >= 0)
      setTasks(prev => {
        const trimmed = filledIndices.map(i => prev[i])
        return [...trimmed, ...tasksToPull.map(t => t.text), '']
      })
      setTaskBuckets(prev => {
        const existing = filledIndices.map(i => prev[i] ?? '')
        return [...existing, ...tasksToPull.map(t => t.bucket || ''), '']
      })
      setTaskFromPool(prev => {
        const existing = filledIndices.map(i => prev[i] ?? '')
        return [...existing, ...tasksToPull.map(originFor), '']
      })
    } else {
      setBlocks(prev => prev.map((b, i) => {
        if (i !== 0) return b
        const filledCount = b.tasks.filter(t => t.trim()).length
        const existingTasks = b.tasks.slice(0, filledCount)
        const existingBuckets = b.taskBuckets.slice(0, filledCount)
        return {
          ...b,
          tasks: [...existingTasks, ...tasksToPull.map(t => t.text), ''],
          taskBuckets: [...existingBuckets, ...tasksToPull.map(t => t.bucket || ''), ''],
        }
      }))
    }
    if (tasksToPull.some(t => t.bucket)) setUseBuckets(true)
  }

  // Toggle a single pool task in/out of the active task list. Used by the chip
  // picker so users add exactly what they want.
  const togglePoolTask = (poolTask: { text: string; bucket?: string }) => {
    if (mode !== 'time_block') {
      // In full_day mode, pool chips target the first block's task list.
      setBlocks(prev => prev.map((b, i) => {
        if (i !== 0) return b
        const has = b.tasks.some(t => t === poolTask.text)
        if (has) {
          const idxs = b.tasks.map((t, j) => (t === poolTask.text ? j : -1)).filter(j => j >= 0)
          const keepIdxs = new Set(b.tasks.map((_, j) => j).filter(j => !idxs.includes(j)))
          return {
            ...b,
            tasks: b.tasks.filter((_, j) => keepIdxs.has(j)),
            taskBuckets: b.taskBuckets.filter((_, j) => keepIdxs.has(j)),
          }
        }
        const filledCount = b.tasks.filter(t => t.trim()).length
        const existingTasks = b.tasks.slice(0, filledCount)
        const existingBuckets = b.taskBuckets.slice(0, filledCount)
        return {
          ...b,
          tasks: [...existingTasks, poolTask.text, ''],
          taskBuckets: [...existingBuckets, poolTask.bucket || '', ''],
        }
      }))
      if (poolTask.bucket) setUseBuckets(true)
      return
    }

    // time_block mode. Match on from_pool (origin), not visible text — so
    // renaming a pulled task doesn't orphan the pool linkage on subsequent
    // toggles.
    const existingIdx = taskFromPool.findIndex(origin => origin === poolTask.text)
    if (existingIdx >= 0) {
      setTasks(prev => prev.filter((_, i) => i !== existingIdx))
      setTaskBuckets(prev => prev.filter((_, i) => i !== existingIdx))
      setTaskFromPool(prev => prev.filter((_, i) => i !== existingIdx))
    } else {
      pullTaskList([poolTask], true)
    }
  }

  const pullCarryTasks = () => {
    if (!carryForward?.carry_tasks?.length) return
    pullTaskList(carryForward.carry_tasks)
    setCarryDismissed(true)
  }
  const pullUnfinishedTasks = () => {
    if (!unfinishedHint?.previous_tasks?.length) return
    pullTaskList(unfinishedHint.previous_tasks)
    setUnfinishedDismissed(true)
  }

  // Task-specific mutators — keep `taskBuckets` and `taskFromPool` aligned.
  const addTaskRow = () => {
    setTasks(prev => [...prev, ''])
    setTaskBuckets(prev => [...prev, ''])
    setTaskFromPool(prev => [...prev, ''])
  }
  const removeTaskRow = (index: number) => {
    setTasks(prev => prev.filter((_, i) => i !== index))
    setTaskBuckets(prev => prev.filter((_, i) => i !== index))
    setTaskFromPool(prev => prev.filter((_, i) => i !== index))
  }
  const handleTaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key !== 'Enter') return
    e.preventDefault()

    const hasNext = index < tasks.length - 1
    if (hasNext) {
      taskRefs.current[index + 1]?.focus()
      return
    }

    if (tasks[index].trim()) {
      addTaskRow()
      setTimeout(() => taskRefs.current[index + 1]?.focus(), 50)
      return
    }

    // Empty last row → jump to Avoidances section.
    avoidRefs.current[0]?.focus()
  }

  // Full-day block helpers
  const updateBlock = (i: number, patch: Partial<BlockDraft>) => {
    setBlocks(prev => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)))
  }
  const addBlock = () => {
    // Anchor new block's start to previous block's end if available.
    setBlocks(prev => {
      const last = prev[prev.length - 1]
      return [...prev, { label: '', start: last?.end || '', end: '', tasks: [''], taskBuckets: [''] }]
    })
  }
  const removeBlock = (i: number) => {
    setBlocks(prev => prev.filter((_, idx) => idx !== i))
  }
  const updateBlockTask = (bi: number, ti: number, value: string) => {
    setBlocks(prev => prev.map((b, idx) =>
      idx !== bi ? b : { ...b, tasks: b.tasks.map((t, tIdx) => (tIdx === ti ? value : t)) }
    ))
  }
  const updateBlockTaskBucket = (bi: number, ti: number, value: string) => {
    setBlocks(prev => prev.map((b, idx) =>
      idx !== bi ? b : { ...b, taskBuckets: b.taskBuckets.map((v, tIdx) => (tIdx === ti ? value : v)) }
    ))
  }
  const addBlockTask = (bi: number) => {
    setBlocks(prev => prev.map((b, idx) =>
      idx !== bi ? b : { ...b, tasks: [...b.tasks, ''], taskBuckets: [...b.taskBuckets, ''] }
    ))
  }
  const removeBlockTask = (bi: number, ti: number) => {
    setBlocks(prev => prev.map((b, idx) =>
      idx !== bi ? b : {
        ...b,
        tasks: b.tasks.filter((_, tIdx) => tIdx !== ti),
        taskBuckets: b.taskBuckets.filter((_, tIdx) => tIdx !== ti),
      }
    ))
  }

  // Fill blocks from today's prayer times: Fajr→Dhuhr, Dhuhr→Asr, Asr→Maghrib, Maghrib→Isha.
  const fillFromPrayerTimes = () => {
    if (!prayerTimes) return
    const { Fajr, Dhuhr, Asr, Maghrib, Isha } = prayerTimes
    const seed: BlockDraft[] = [
      { label: 'Fajr → Dhuhr', start: Fajr, end: Dhuhr, tasks: [''], taskBuckets: [''] },
      { label: 'Dhuhr → Asr', start: Dhuhr, end: Asr, tasks: [''], taskBuckets: [''] },
      { label: 'Asr → Maghrib', start: Asr, end: Maghrib, tasks: [''], taskBuckets: [''] },
      { label: 'Maghrib → Isha', start: Maghrib, end: Isha, tasks: [''], taskBuckets: [''] },
    ]
    // Preserve already-typed tasks by merging where labels match.
    setBlocks(prev => seed.map(s => {
      const existing = prev.find(b => b.label === s.label)
      return existing
        ? { ...s, tasks: existing.tasks, taskBuckets: existing.taskBuckets }
        : s
    }))
  }

  // Validation — full-day blocks must each have a start, end, label, and end > start.
  const blocksValid = blocks.length > 0 && blocks.every(b => {
    if (!b.label.trim() || !b.start || !b.end) return false
    const [sh, sm] = b.start.split(':').map(Number)
    const [eh, em] = b.end.split(':').map(Number)
    return eh * 60 + em > sh * 60 + sm
  }) && blocks.some(b => b.tasks.some(t => t.trim()))

  const canProceed = mode === 'full_day'
    ? blocksValid
    : tasks.some(t => t.trim()) && timeBlockStart && timeBlockEnd && !timeError

  const handleSubmit = () => {
    if (mode === 'full_day') {
      // Flatten: each task's caption becomes "Block · Bucket" when the user
      // picked a bucket, otherwise just "Block". Muhasaba renders this as a
      // single caption without special-casing.
      const captionFor = (blockLabel: string, userBucket: string) => {
        const bucket = useBuckets && userBucket && buckets.includes(userBucket) ? userBucket : ''
        return bucket ? `${blockLabel} · ${bucket}` : blockLabel
      }
      const flatTasks = blocks.flatMap(b =>
        b.tasks
          .map((text, i) => ({ text, userBucket: b.taskBuckets[i] || '' }))
          .filter(t => t.text.trim())
          .map(t => ({ text: t.text, completed: false, bucket: captionFor(b.label, t.userBucket) }))
      )
      const envelopeStart = blocks[0]?.start || ''
      const envelopeEnd = blocks[blocks.length - 1]?.end || ''

      onComplete({
        tasks: flatTasks,
        blocks: blocks.map(b => ({
          label: b.label,
          start: b.start,
          end: b.end,
          tasks: b.tasks
            .map((text, i) => ({ text, userBucket: b.taskBuckets[i] || '' }))
            .filter(t => t.text.trim())
            .map(t => {
              const userBucket = useBuckets && t.userBucket && buckets.includes(t.userBucket)
                ? t.userBucket
                : undefined
              return userBucket
                ? { text: t.text, completed: false, bucket: userBucket }
                : { text: t.text, completed: false }
            }),
        })),
        avoidances: avoidances.filter(a => a.trim()),
        boundaries: boundaries.filter(b => b.trim()),
        time_block_start: envelopeStart,
        time_block_end: envelopeEnd,
        dua_recited: duaRecited,
        _lat: userLocation?.lat,
        _lng: userLocation?.lng,
      })
      return
    }

    const finalTasks = tasks
      .map((text, i) => ({ text, bucket: taskBuckets[i], fromPool: taskFromPool[i] }))
      .filter(t => t.text.trim())
      .map(t => {
        const bucket = useBuckets && t.bucket && buckets.includes(t.bucket) ? t.bucket : undefined
        const base: { text: string; completed: boolean; bucket?: string; from_pool?: string } = {
          text: t.text,
          completed: false,
        }
        if (bucket) base.bucket = bucket
        if (t.fromPool) base.from_pool = t.fromPool
        return base
      })

    onComplete({
      tasks: finalTasks,
      avoidances: avoidances.filter(a => a.trim()),
      boundaries: boundaries.filter(b => b.trim()),
      time_block_start: timeBlockStart,
      time_block_end: timeBlockEnd,
      dua_recited: duaRecited,
      _lat: userLocation?.lat,
      _lng: userLocation?.lng,
    })
  }

  const handlePrayerClick = (name: string, time: string) => {
    setSelectedPrayer(name)
    if (!timeBlockStart) setTimeBlockStart(time)
    else if (!timeBlockEnd) setTimeBlockEnd(time)
    setTimeout(() => setSelectedPrayer(null), 400)
  }

  const renderListSection = (
    items: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    label: string,
    sublabel: string,
    placeholder: string,
    addLabel: string,
    onExit?: () => void,
  ) => (
    <motion.div variants={fadeUp} className="space-y-3">
      <label className="text-text-primary text-sm font-medium">
        {label} <span className="text-text-muted font-normal">{sublabel}</span>
      </label>
      <AnimatePresence mode="popLayout">
        {items.map((val, i) => (
          <motion.div key={`${label}-${i}`} {...itemEnter} className="flex gap-2">
            <input
              ref={(el) => { refs.current[i] = el }}
              type="text"
              value={val}
              onChange={(e) => updateItem(setter, i, e.target.value)}
              onKeyDown={(e) => handleListKeyDown(e, items, setter, refs, i, onExit)}
              placeholder={placeholder}
              className="input-dark flex-1"
            />
            {items.length > 1 && (
              <motion.button
                onClick={() => removeItem(setter, i)}
                className="text-text-muted hover:text-text-secondary p-2"
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
              >
                <X size={16} />
              </motion.button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      <motion.button
        onClick={() => addItem(setter)}
        className="text-gold-dim hover:text-gold text-sm flex items-center gap-1"
        whileHover={{ x: 4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <Plus size={14} /> {addLabel}
      </motion.button>
    </motion.div>
  )

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-8 pt-4"
    >
      {/* Carry-forward banner — surfaces intentions set in yesterday's Muataba.
          Appears only on new sessions (not on edit), hence the `!initialData` gate. */}
      {!initialData && carryForward && !carryDismissed && (
        <motion.div
          variants={fadeUp}
          className="glass-card-gold p-4 space-y-3 relative"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
              <Sparkles size={14} className="text-gold" />
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <p className="text-text-muted text-[11px] uppercase tracking-[0.15em]">From yesterday</p>
              {carryForward.change_for_tomorrow && (
                <div className="space-y-2">
                  <p className="text-text-secondary text-sm italic">
                    &ldquo;{carryForward.change_for_tomorrow}&rdquo;
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <motion.button
                      onClick={applyChangeToAvoidances}
                      className="px-3 py-1 rounded-lg text-xs border border-gold/30 bg-gold/[0.06] text-gold hover:bg-gold/[0.1] transition-all"
                      whileTap={{ scale: 0.95 }}
                    >
                      + Add as avoidance
                    </motion.button>
                    <motion.button
                      onClick={applyChangeToBoundaries}
                      className="px-3 py-1 rounded-lg text-xs border border-emerald-light/30 bg-emerald/[0.04] text-emerald-light hover:bg-emerald/[0.08] transition-all"
                      whileTap={{ scale: 0.95 }}
                    >
                      + Add as boundary
                    </motion.button>
                  </div>
                </div>
              )}
              {carryForward.carry_tasks && carryForward.carry_tasks.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-text-secondary text-xs">
                    {carryForward.carry_tasks.length} {carryForward.carry_tasks.length === 1 ? 'task' : 'tasks'} you said to carry forward
                  </p>
                  <motion.button
                    onClick={pullCarryTasks}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs border border-gold/30 bg-gold/[0.06] text-gold hover:bg-gold/[0.1] transition-all"
                    whileTap={{ scale: 0.95 }}
                  >
                    <ArrowDownCircle size={12} />
                    Pull into tasks
                  </motion.button>
                </div>
              )}
            </div>
            <button
              onClick={() => setCarryDismissed(true)}
              className="flex-shrink-0 text-text-muted hover:text-text-secondary transition-colors p-1"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Unfinished-tasks hint — shown only when no carryForward banner was shown. */}
      {!initialData && !carryForward && unfinishedHint && !unfinishedDismissed && (
        <motion.div variants={fadeUp} className="glass-card p-4 space-y-3 relative">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold/[0.06] flex items-center justify-center">
              <ArrowDownCircle size={14} className="text-gold-dim" />
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <p className="text-text-muted text-[11px] uppercase tracking-[0.15em]">Unfinished yesterday</p>
              <p className="text-text-secondary text-sm">
                You completed {unfinishedHint.completed_count} of {unfinishedHint.total_count} tasks.
                Want to pull the list in and pick up where you left off?
              </p>
              <motion.button
                onClick={pullUnfinishedTasks}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs border border-gold/25 bg-gold/[0.04] text-gold hover:bg-gold/[0.08] transition-all"
                whileTap={{ scale: 0.95 }}
              >
                <ArrowDownCircle size={12} />
                Pull {unfinishedHint.previous_tasks.length} {unfinishedHint.previous_tasks.length === 1 ? 'task' : 'tasks'}
              </motion.button>
            </div>
            <button
              onClick={() => setUnfinishedDismissed(true)}
              className="flex-shrink-0 text-text-muted hover:text-text-secondary transition-colors p-1"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Principle */}
      <motion.div variants={fadeUp} className="glass-card p-5">
        <p className="text-text-secondary text-sm leading-relaxed italic">
          &ldquo;You are the employer. Your nafs is the employee. No employer lets an employee
          show up without a job description.&rdquo;
        </p>
      </motion.div>

      {/* Time-block mode: Tasks + single Time Block */}
      {mode === 'time_block' && (<>
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <label className="text-text-primary text-sm font-medium flex items-center gap-2">
            What must you accomplish this session?
          </label>
          {buckets.length > 0 && (
            <motion.button
              onClick={() => setUseBuckets(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all ${
                useBuckets
                  ? 'border-gold/30 bg-gold/[0.05] text-gold'
                  : 'border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-accent'
              }`}
              whileTap={{ scale: 0.95 }}
              title="Group tasks by bucket"
            >
              <Layers size={12} />
              Buckets
            </motion.button>
          )}
        </div>
        <AnimatePresence mode="popLayout">
          {tasks.map((task, i) => (
            <motion.div key={`task-${i}`} {...itemEnter} className="space-y-1.5">
              <div className="flex gap-2">
                <input
                  ref={(el) => { taskRefs.current[i] = el }}
                  type="text"
                  value={task}
                  onChange={(e) => updateItem(setTasks, i, e.target.value)}
                  onKeyDown={(e) => handleTaskKeyDown(e, i)}
                  placeholder={i === 0 ? 'Most important task...' : 'Another task...'}
                  className="input-dark flex-1 min-w-0"
                />
                {tasks.length > 1 && (
                  <motion.button
                    onClick={() => removeTaskRow(i)}
                    className="text-text-muted hover:text-text-secondary p-2"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.85 }}
                  >
                    <X size={16} />
                  </motion.button>
                )}
              </div>
              {useBuckets && buckets.length > 0 && (
                <div className="flex items-center gap-2 pl-1">
                  <Layers size={13} className={taskBuckets[i] ? 'text-gold shrink-0' : 'text-text-muted shrink-0'} />
                  <select
                    value={taskBuckets[i] || ''}
                    onChange={(e) =>
                      setTaskBuckets(prev => prev.map((b, idx) => (idx === i ? e.target.value : b)))
                    }
                    className={`text-sm py-1.5 px-3 rounded-lg border cursor-pointer transition-all font-medium max-w-full ${
                      taskBuckets[i]
                        ? 'border-gold/50 text-gold bg-gold/[0.1] shadow-[0_0_0_3px_rgba(212,175,55,0.04)]'
                        : 'border-border-accent text-text-secondary bg-bg-elevated/40 hover:text-gold hover:border-gold/40'
                    }`}
                    aria-label="Bucket"
                  >
                    <option value="">— No bucket —</option>
                    {buckets.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <motion.button
          onClick={addTaskRow}
          className="text-gold-dim hover:text-gold text-sm flex items-center gap-1"
          whileHover={{ x: 4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Plus size={14} /> Add task
        </motion.button>
        {!initialData && taskPool && taskPool.length > 0 && (
          <div className="pt-2 space-y-2">
            <div className="flex items-center gap-2">
              <ArrowDownCircle size={12} className="text-gold-dim" />
              <span className="text-text-muted text-[11px] uppercase tracking-[0.15em]">
                From your pool
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {taskPool.map((pt, i) => {
                const selected = mode === 'time_block'
                  ? taskFromPool.some(origin => origin === pt.text)
                  : blocks[0]?.tasks.some(t => t === pt.text) ?? false
                return (
                  <motion.button
                    key={`pool-chip-${i}`}
                    onClick={() => togglePoolTask(pt)}
                    className={`px-2.5 py-1 rounded-lg text-xs border transition-all text-left ${
                      selected
                        ? 'border-gold/40 bg-gold/[0.08] text-gold'
                        : 'border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-accent'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    {selected ? '✓ ' : '+ '}{pt.text}
                    {pt.bucket && (
                      <span className={`ml-1.5 text-[10px] ${selected ? 'text-gold/60' : 'text-text-muted/70'}`}>
                        · {pt.bucket}
                      </span>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* Time Block */}
      <motion.div variants={fadeUp} className="space-y-3">
        <label className="text-text-primary text-sm font-medium flex items-center gap-2">
          <Clock size={16} className="text-gold" />
          Time Block
        </label>

        {prayerTimes && (
          <motion.div
            className="flex flex-wrap gap-2 mb-3"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.05 } },
            }}
          >
            {Object.entries(prayerTimes).map(([name, time]) => (
              <motion.button
                key={name}
                variants={{
                  hidden: { opacity: 0, scale: 0.9 },
                  show: { opacity: 1, scale: 1 },
                }}
                onClick={() => handlePrayerClick(name, time)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                  selectedPrayer === name
                    ? 'border-gold/40 bg-gold/10 text-gold'
                    : 'border-border-subtle text-text-secondary hover:border-gold-dim hover:text-gold'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {name} <span className="text-text-muted ml-1">{time}</span>
              </motion.button>
            ))}
          </motion.div>
        )}

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-text-muted text-xs mb-1 block">Start</label>
            <div className="flex gap-2">
              <input
                ref={startTimeRef}
                type="time"
                value={timeBlockStart}
                onChange={(e) => setTimeBlockStart(e.target.value)}
                className="input-dark flex-1"
              />
              <button
                onClick={() => setTimeBlockStart(getNowTime())}
                className="px-3 py-2 rounded-lg text-xs border border-border-subtle text-text-secondary hover:border-gold-dim hover:text-gold transition-all whitespace-nowrap"
              >
                Now
              </button>
            </div>
          </div>
          <span className="text-text-muted pb-2.5">to</span>
          <div className="flex-1">
            <label className="text-text-muted text-xs mb-1 block">End</label>
            <input
              type="time"
              value={timeBlockEnd}
              onChange={(e) => setTimeBlockEnd(e.target.value)}
              className="input-dark"
            />
          </div>
        </div>

        {timeError && (
          <p className="text-accent-warm text-xs">{timeError}</p>
        )}

        {prayerTimes && !timeError && (
          <p className="text-text-muted text-xs">
            Tap a prayer time to set block boundaries
          </p>
        )}
      </motion.div>
      </>)}

      {/* Full-day mode: schedule of blocks */}
      {mode === 'full_day' && (
        <motion.div variants={fadeUp} className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="text-text-primary text-sm font-medium flex items-center gap-2">
              <Clock size={16} className="text-gold" />
              Day Schedule
            </label>
            <div className="flex items-center gap-2">
              {buckets.length > 0 && (
                <motion.button
                  onClick={() => setUseBuckets(prev => !prev)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all ${
                    useBuckets
                      ? 'border-gold/30 bg-gold/[0.05] text-gold'
                      : 'border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-accent'
                  }`}
                  whileTap={{ scale: 0.95 }}
                  title="Assign buckets to individual tasks"
                >
                  <Layers size={12} />
                  Buckets
                </motion.button>
              )}
              {prayerTimes && (
                <motion.button
                  onClick={fillFromPrayerTimes}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border border-border-subtle text-text-secondary hover:text-gold hover:border-gold/30 transition-all"
                  whileTap={{ scale: 0.95 }}
                >
                  Use prayer times
                </motion.button>
              )}
            </div>
          </div>

          <p className="text-text-muted text-xs leading-relaxed">
            Build your day as blocks around fixed anchors. Each block is its own mini-contract —
            tasks assigned here become grouped by block throughout the session.
          </p>

          <AnimatePresence mode="popLayout">
            {blocks.map((block, bi) => (
              <motion.div
                key={`block-${bi}`}
                {...itemEnter}
                className="glass-card p-4 space-y-3"
              >
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={block.label}
                    onChange={(e) => updateBlock(bi, { label: e.target.value })}
                    placeholder={bi === 0 ? 'Block label (e.g. Fajr → Dhuhr)' : 'Block label...'}
                    className="input-dark flex-1 font-medium"
                  />
                  {blocks.length > 1 && (
                    <motion.button
                      onClick={() => removeBlock(bi)}
                      className="text-text-muted hover:text-text-secondary p-2"
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      title="Remove block"
                    >
                      <X size={16} />
                    </motion.button>
                  )}
                </div>

                <div className="flex gap-2 items-center">
                  <input
                    type="time"
                    value={block.start}
                    onChange={(e) => updateBlock(bi, { start: e.target.value })}
                    className="input-dark flex-1"
                    aria-label="Block start"
                  />
                  <span className="text-text-muted text-xs">to</span>
                  <input
                    type="time"
                    value={block.end}
                    onChange={(e) => updateBlock(bi, { end: e.target.value })}
                    className="input-dark flex-1"
                    aria-label="Block end"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <p className="text-text-muted text-[11px] uppercase tracking-wider">Tasks</p>
                  <AnimatePresence mode="popLayout">
                    {block.tasks.map((task, ti) => (
                      <motion.div
                        key={`block-${bi}-task-${ti}`}
                        {...itemEnter}
                        className="space-y-1.5"
                      >
                        <div className="flex gap-2">
                          <input
                            ref={(el) => {
                              if (!blockTaskRefs.current[bi]) blockTaskRefs.current[bi] = []
                              if (el) blockTaskRefs.current[bi][ti] = el
                            }}
                            type="text"
                            value={task}
                            onChange={(e) => updateBlockTask(bi, ti, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter') return
                              e.preventDefault()
                              const row = blockTaskRefs.current[bi] || []
                              const hasNext = ti < block.tasks.length - 1
                              if (hasNext) {
                                row[ti + 1]?.focus()
                                return
                              }
                              if (task.trim()) {
                                addBlockTask(bi)
                                setTimeout(() => {
                                  blockTaskRefs.current[bi]?.[ti + 1]?.focus()
                                }, 50)
                                return
                              }
                              // Empty last row → jump to first task of next block, or
                              // stay put if this is the last block.
                              const nextBlockFirst = blockTaskRefs.current[bi + 1]?.[0]
                              nextBlockFirst?.focus()
                            }}
                            placeholder={ti === 0 ? 'What must happen in this block?' : 'Another task...'}
                            className="input-dark flex-1 min-w-0"
                          />
                          {block.tasks.length > 1 && (
                            <motion.button
                              onClick={() => removeBlockTask(bi, ti)}
                              className="text-text-muted hover:text-text-secondary p-2"
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.85 }}
                            >
                              <X size={14} />
                            </motion.button>
                          )}
                        </div>
                        {useBuckets && buckets.length > 0 && (
                          <div className="flex items-center gap-2 pl-1">
                            <Layers size={13} className={block.taskBuckets[ti] ? 'text-gold shrink-0' : 'text-text-muted shrink-0'} />
                            <select
                              value={block.taskBuckets[ti] || ''}
                              onChange={(e) => updateBlockTaskBucket(bi, ti, e.target.value)}
                              className={`text-sm py-1.5 px-3 rounded-lg border cursor-pointer transition-all font-medium max-w-full ${
                                block.taskBuckets[ti]
                                  ? 'border-gold/50 text-gold bg-gold/[0.1] shadow-[0_0_0_3px_rgba(212,175,55,0.04)]'
                                  : 'border-border-accent text-text-secondary bg-bg-elevated/40 hover:text-gold hover:border-gold/40'
                              }`}
                              aria-label="Bucket"
                            >
                              <option value="">— No bucket —</option>
                              {buckets.map(b => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <motion.button
                    onClick={() => addBlockTask(bi)}
                    className="text-gold-dim hover:text-gold text-xs flex items-center gap-1"
                    whileHover={{ x: 3 }}
                  >
                    <Plus size={12} /> Add task
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <motion.button
            onClick={addBlock}
            className="text-gold-dim hover:text-gold text-sm flex items-center gap-1"
            whileHover={{ x: 4 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Plus size={14} /> Add block
          </motion.button>
        </motion.div>
      )}

      {/* Avoidances */}
      {renderListSection(
        avoidances, setAvoidances, avoidRefs,
        'Avoidances', '— what will you not do?',
        'e.g. No Instagram, no Slack...',
        'Add avoidance',
        // eslint-disable-next-line react-hooks/refs -- onExit callback is invoked on keydown, not during render
        focusBoundaryFirst,
      )}

      {/* Boundaries */}
      {renderListSection(
        boundaries, setBoundaries, boundaryRefs,
        'Boundaries', '— limits on how you engage',
        "e.g. Won't skip Dhuhr, will eat a real meal...",
        'Add boundary',
        // eslint-disable-next-line react-hooks/refs -- onExit callback is invoked on keydown, not during render
        mode === 'time_block' ? focusStartTime : undefined,
      )}

      {/* Bismillah */}
      <motion.div variants={fadeUp}>
        <motion.button
          onClick={() => setDuaRecited(!duaRecited)}
          className={`w-full p-4 rounded-xl border text-center transition-colors ${
            duaRecited
              ? 'border-gold/30 bg-gold/[0.04]'
              : 'border-border-subtle hover:border-border-accent'
          }`}
          animate={duaRecited ? {
            boxShadow: ['0 0 0 0 rgba(212, 175, 55, 0)', '0 0 40px 10px rgba(212, 175, 55, 0.12)', '0 0 20px 4px rgba(212, 175, 55, 0.06)'],
          } : {
            boxShadow: '0 0 0 0 rgba(212, 175, 55, 0)',
          }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.p
            className="arabic text-gold text-lg mb-1"
            animate={duaRecited ? {
              textShadow: '0 0 30px rgba(212, 175, 55, 0.4)',
              scale: 1.05,
            } : {
              textShadow: '0 0 0px rgba(212, 175, 55, 0)',
              scale: 1,
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            بسم الله الرحمن الرحيم
          </motion.p>
          <AnimatePresence mode="wait">
            <motion.p
              key={duaRecited ? 'recited' : 'prompt'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-text-muted text-xs"
            >
              {duaRecited ? 'Bismillah recited' : 'Tap to begin with Bismillah'}
            </motion.p>
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* Submit */}
      <motion.div variants={fadeUp} className="pt-2 space-y-2">
        <motion.button
          onClick={handleSubmit}
          disabled={!canProceed}
          className="btn-gold w-full text-base"
          whileHover={canProceed ? { scale: 1.02 } : {}}
          whileTap={canProceed ? { scale: 0.98 } : {}}
          animate={{ opacity: canProceed ? 1 : 0.35 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          {submitLabel}
        </motion.button>
        {onCancel && (
          <motion.button
            onClick={onCancel}
            className="btn-ghost w-full text-sm"
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  )
}
