'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, X, Clock } from 'lucide-react'
import type { Session, PrayerTimes } from '@/lib/types'

export function Musharata({
  session,
  onComplete,
}: {
  session: Session
  onComplete: (data: Record<string, unknown>) => void
}) {
  const [tasks, setTasks] = useState<string[]>([''])
  const [avoidances, setAvoidances] = useState<string[]>([''])
  const [boundaries, setBoundaries] = useState<string[]>([''])
  const [timeBlockStart, setTimeBlockStart] = useState('')
  const [timeBlockEnd, setTimeBlockEnd] = useState('')
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null)
  const [duaRecited, setDuaRecited] = useState(false)

  useEffect(() => {
    // Get user location and fetch prayer times
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const res = await fetch(
            `/api/prayer-times?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          )
          const data = await res.json()
          setPrayerTimes(data)
        },
        async () => {
          // Fallback - fetch without location
          const res = await fetch('/api/prayer-times')
          const data = await res.json()
          setPrayerTimes(data)
        }
      )
    }
  }, [])

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

  const canProceed =
    tasks.some(t => t.trim()) &&
    timeBlockStart &&
    timeBlockEnd

  const handleSubmit = () => {
    onComplete({
      tasks: tasks.filter(t => t.trim()).map(t => ({ text: t, completed: false })),
      avoidances: avoidances.filter(a => a.trim()),
      boundaries: boundaries.filter(b => b.trim()),
      time_block_start: timeBlockStart,
      time_block_end: timeBlockEnd,
      dua_recited: duaRecited,
    })
  }

  const stagger = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-8 pt-4"
    >
      {/* Principle */}
      <motion.div variants={item} className="glass-card p-5">
        <p className="text-text-secondary text-sm leading-relaxed italic">
          &ldquo;You are the employer. Your nafs is the employee. No employer lets an employee
          show up without a job description.&rdquo;
        </p>
      </motion.div>

      {/* Tasks */}
      <motion.div variants={item} className="space-y-3">
        <label className="text-text-primary text-sm font-medium flex items-center gap-2">
          What must you accomplish this session?
        </label>
        {tasks.map((task, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={task}
              onChange={(e) => updateItem(setTasks, i, e.target.value)}
              placeholder={i === 0 ? 'Most important task...' : 'Another task...'}
              className="input-dark flex-1"
            />
            {tasks.length > 1 && (
              <button
                onClick={() => removeItem(setTasks, i)}
                className="text-text-muted hover:text-text-secondary transition-colors p-2"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => addItem(setTasks)}
          className="text-gold-dim hover:text-gold text-sm flex items-center gap-1 transition-colors"
        >
          <Plus size={14} /> Add task
        </button>
      </motion.div>

      {/* Time Block with Prayer Time Anchors */}
      <motion.div variants={item} className="space-y-3">
        <label className="text-text-primary text-sm font-medium flex items-center gap-2">
          <Clock size={16} className="text-gold" />
          Time Block
        </label>

        {prayerTimes && (
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.entries(prayerTimes).map(([name, time]) => (
              <button
                key={name}
                onClick={() => {
                  if (!timeBlockStart) setTimeBlockStart(time)
                  else if (!timeBlockEnd) setTimeBlockEnd(time)
                }}
                className="px-3 py-1.5 rounded-lg text-xs border border-border-subtle text-text-secondary hover:border-gold-dim hover:text-gold transition-all"
              >
                {name} <span className="text-text-muted ml-1">{time}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <label className="text-text-muted text-xs mb-1 block">Start</label>
            <input
              type="time"
              value={timeBlockStart}
              onChange={(e) => setTimeBlockStart(e.target.value)}
              className="input-dark"
            />
          </div>
          <span className="text-text-muted mt-5">to</span>
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

        {prayerTimes && (
          <p className="text-text-muted text-xs">
            Tap a prayer time above to quickly set your block boundaries
          </p>
        )}
      </motion.div>

      {/* Avoidances */}
      <motion.div variants={item} className="space-y-3">
        <label className="text-text-primary text-sm font-medium">
          Avoidances <span className="text-text-muted font-normal">— what will you not do?</span>
        </label>
        {avoidances.map((avoid, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={avoid}
              onChange={(e) => updateItem(setAvoidances, i, e.target.value)}
              placeholder="e.g. No Instagram, no Slack..."
              className="input-dark flex-1"
            />
            {avoidances.length > 1 && (
              <button onClick={() => removeItem(setAvoidances, i)} className="text-text-muted hover:text-text-secondary p-2">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => addItem(setAvoidances)}
          className="text-gold-dim hover:text-gold text-sm flex items-center gap-1 transition-colors"
        >
          <Plus size={14} /> Add avoidance
        </button>
      </motion.div>

      {/* Boundaries */}
      <motion.div variants={item} className="space-y-3">
        <label className="text-text-primary text-sm font-medium">
          Boundaries <span className="text-text-muted font-normal">— limits on how you engage</span>
        </label>
        {boundaries.map((boundary, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={boundary}
              onChange={(e) => updateItem(setBoundaries, i, e.target.value)}
              placeholder="e.g. Won't skip Dhuhr, will eat a real meal..."
              className="input-dark flex-1"
            />
            {boundaries.length > 1 && (
              <button onClick={() => removeItem(setBoundaries, i)} className="text-text-muted hover:text-text-secondary p-2">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => addItem(setBoundaries)}
          className="text-gold-dim hover:text-gold text-sm flex items-center gap-1 transition-colors"
        >
          <Plus size={14} /> Add boundary
        </button>
      </motion.div>

      {/* Bismillah */}
      <motion.div variants={item}>
        <button
          onClick={() => setDuaRecited(!duaRecited)}
          className={`w-full p-4 rounded-xl border text-center transition-all ${
            duaRecited
              ? 'border-gold/30 bg-gold/5'
              : 'border-border-subtle hover:border-border-accent'
          }`}
        >
          <p className="arabic text-gold text-lg mb-1">بسم الله الرحمن الرحيم</p>
          <p className="text-text-muted text-xs">
            {duaRecited ? 'Bismillah recited' : 'Tap to begin with Bismillah'}
          </p>
        </button>
      </motion.div>

      {/* Submit */}
      <motion.div variants={item} className="pt-2">
        <button
          onClick={handleSubmit}
          disabled={!canProceed}
          className={`btn-gold w-full text-base ${!canProceed ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          Begin Session
        </button>
      </motion.div>
    </motion.div>
  )
}
