'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Session, PrayerTimes } from '@/lib/types'

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

export function Musharata({
  session,
  onComplete,
}: {
  session: Session
  onComplete: (data: Record<string, unknown>) => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const [tasks, setTasks] = useState<string[]>([''])
  const [avoidances, setAvoidances] = useState<string[]>([''])
  const [boundaries, setBoundaries] = useState<string[]>([''])
  const [presetsLoaded, setPresetsLoaded] = useState(false)
  const [timeBlockStart, setTimeBlockStart] = useState('')
  const [timeBlockEnd, setTimeBlockEnd] = useState('')
  const [timeError, setTimeError] = useState('')
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null)
  const [duaRecited, setDuaRecited] = useState(false)
  const [selectedPrayer, setSelectedPrayer] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Refs for focusing next input on Enter
  const taskRefs = useRef<(HTMLInputElement | null)[]>([])
  const avoidRefs = useRef<(HTMLInputElement | null)[]>([])
  const boundaryRefs = useRef<(HTMLInputElement | null)[]>([])

  // Load user presets on mount
  useEffect(() => {
    const loadPresets = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('presets, prayer_method')
        .eq('id', session.user_id)
        .single()

      if (data?.presets && !presetsLoaded) {
        const p = data.presets as { avoidances?: string[]; boundaries?: string[] }
        if (p.avoidances?.length) setAvoidances([...p.avoidances, ''])
        if (p.boundaries?.length) setBoundaries([...p.boundaries, ''])
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

  // Enter key: add new item and focus it
  const handleListKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    items: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    index: number,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (items[index].trim()) {
        setter(prev => [...prev, ''])
        // Focus new input after render
        setTimeout(() => refs.current[index + 1]?.focus(), 50)
      }
    }
  }, [])

  const canProceed = tasks.some(t => t.trim()) && timeBlockStart && timeBlockEnd && !timeError

  const handleSubmit = () => {
    onComplete({
      tasks: tasks.filter(t => t.trim()).map(t => ({ text: t, completed: false })),
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
              onKeyDown={(e) => handleListKeyDown(e, items, setter, refs, i)}
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
      {/* Principle */}
      <motion.div variants={fadeUp} className="glass-card p-5">
        <p className="text-text-secondary text-sm leading-relaxed italic">
          &ldquo;You are the employer. Your nafs is the employee. No employer lets an employee
          show up without a job description.&rdquo;
        </p>
      </motion.div>

      {/* Tasks */}
      <motion.div variants={fadeUp} className="space-y-3">
        <label className="text-text-primary text-sm font-medium flex items-center gap-2">
          What must you accomplish this session?
        </label>
        <AnimatePresence mode="popLayout">
          {tasks.map((task, i) => (
            <motion.div key={`task-${i}`} {...itemEnter} className="flex gap-2">
              <input
                ref={(el) => { taskRefs.current[i] = el }}
                type="text"
                value={task}
                onChange={(e) => updateItem(setTasks, i, e.target.value)}
                onKeyDown={(e) => handleListKeyDown(e, tasks, setTasks, taskRefs, i)}
                placeholder={i === 0 ? 'Most important task...' : 'Another task...'}
                className="input-dark flex-1"
              />
              {tasks.length > 1 && (
                <motion.button
                  onClick={() => removeItem(setTasks, i)}
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
          onClick={() => addItem(setTasks)}
          className="text-gold-dim hover:text-gold text-sm flex items-center gap-1"
          whileHover={{ x: 4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Plus size={14} /> Add task
        </motion.button>
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

      {/* Avoidances */}
      {renderListSection(
        avoidances, setAvoidances, avoidRefs,
        'Avoidances', '— what will you not do?',
        'e.g. No Instagram, no Slack...',
        'Add avoidance',
      )}

      {/* Boundaries */}
      {renderListSection(
        boundaries, setBoundaries, boundaryRefs,
        'Boundaries', '— limits on how you engage',
        "e.g. Won't skip Dhuhr, will eat a real meal...",
        'Add boundary',
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
      <motion.div variants={fadeUp} className="pt-2">
        <motion.button
          onClick={handleSubmit}
          disabled={!canProceed}
          className="btn-gold w-full text-base"
          whileHover={canProceed ? { scale: 1.02 } : {}}
          whileTap={canProceed ? { scale: 0.98 } : {}}
          animate={{ opacity: canProceed ? 1 : 0.35 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          Begin Session
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
