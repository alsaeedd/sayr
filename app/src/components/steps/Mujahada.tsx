'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import type { Session } from '@/lib/types'

const COMMON_LIES = [
  '"Just check it quickly"',
  '"You deserve a break" (after 15 min)',
  '"This other thing is more urgent"',
  '"You\'re going to fail anyway"',
  '"You can do it later"',
]

export function Mujahada({
  session,
  onComplete,
}: {
  session: Session
  onComplete: (data: Record<string, unknown>) => void
}) {
  const [nafsLies, setNafsLies] = useState<string[]>([''])
  const [strategies, setStrategies] = useState<string[]>([''])
  const [reflection, setReflection] = useState('')

  const handleSubmit = () => {
    onComplete({
      nafs_lies: nafsLies.filter(l => l.trim()),
      strategies: strategies.filter(s => s.trim()),
      reflection,
    })
  }

  const stagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
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
          &ldquo;The mujahid is the one who strives against his own nafs.&rdquo;
          <span className="text-text-muted block mt-1">— The Prophet (peace be upon him)</span>
        </p>
        <p className="text-text-muted text-xs mt-3">
          Mujahada is effort at the point of resistance — the push to get the wheel turning,
          not the force to keep it spinning.
        </p>
      </motion.div>

      {/* Common lies of the nafs */}
      <motion.div variants={item} className="space-y-3">
        <label className="text-text-primary text-sm font-medium">
          What lies did your nafs tell you today?
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {COMMON_LIES.map((lie, i) => (
            <button
              key={i}
              onClick={() => {
                if (!nafsLies.includes(lie)) {
                  setNafsLies(prev => {
                    const filtered = prev.filter(l => l.trim())
                    return [...filtered, lie]
                  })
                }
              }}
              className="px-3 py-1.5 rounded-lg text-xs border border-border-subtle text-text-muted hover:border-gold-dim hover:text-text-secondary transition-all"
            >
              {lie}
            </button>
          ))}
        </div>
        {nafsLies.map((lie, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={lie}
              onChange={(e) =>
                setNafsLies(prev => prev.map((l, idx) => (idx === i ? e.target.value : l)))
              }
              placeholder="What did your nafs whisper?"
              className="input-dark flex-1"
            />
            {nafsLies.length > 1 && (
              <button
                onClick={() => setNafsLies(prev => prev.filter((_, idx) => idx !== i))}
                className="text-text-muted hover:text-text-secondary p-2"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setNafsLies(prev => [...prev, ''])}
          className="text-gold-dim hover:text-gold text-sm flex items-center gap-1 transition-colors"
        >
          <Plus size={14} /> Add lie
        </button>
      </motion.div>

      {/* Strategies */}
      <motion.div variants={item} className="space-y-3">
        <label className="text-text-primary text-sm font-medium">
          Pre-commit your response
        </label>
        <p className="text-text-muted text-xs">
          &ldquo;When my nafs says X, I will do Y.&rdquo;
        </p>
        {strategies.map((strategy, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={strategy}
              onChange={(e) =>
                setStrategies(prev => prev.map((s, idx) => (idx === i ? e.target.value : s)))
              }
              placeholder="e.g. When I want to check my phone → 5 min rule"
              className="input-dark flex-1"
            />
            {strategies.length > 1 && (
              <button
                onClick={() => setStrategies(prev => prev.filter((_, idx) => idx !== i))}
                className="text-text-muted hover:text-text-secondary p-2"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setStrategies(prev => [...prev, ''])}
          className="text-gold-dim hover:text-gold text-sm flex items-center gap-1 transition-colors"
        >
          <Plus size={14} /> Add strategy
        </button>
      </motion.div>

      {/* Reflection */}
      <motion.div variants={item} className="space-y-3">
        <label className="text-text-primary text-sm font-medium">
          Reflection on your striving
        </label>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Where was the resistance strongest? Where did you push through?"
          className="textarea-dark"
          rows={3}
        />
      </motion.div>

      {/* Submit */}
      <motion.div variants={item} className="pt-2">
        <button onClick={handleSubmit} className="btn-gold w-full text-base">
          Continue to Final Step
        </button>
      </motion.div>
    </motion.div>
  )
}
