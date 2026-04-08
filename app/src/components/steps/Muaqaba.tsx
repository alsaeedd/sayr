'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import type { Session } from '@/lib/types'

export function Muaqaba({
  session,
  onComplete,
}: {
  session: Session
  onComplete: (data: Record<string, unknown>) => void
}) {
  const muhasaba = session.muhasaba
  const [adjustments, setAdjustments] = useState<string[]>([''])
  const [notes, setNotes] = useState('')

  const handleSubmit = () => {
    onComplete({
      adjustments: adjustments.filter(a => a.trim()),
      notes,
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
          &ldquo;Mu&apos;aqaba is not anger at yourself. It is the response of a wise captain
          adjusting sails when the wind shifts. The destination doesn&apos;t change — the route does.&rdquo;
        </p>
      </motion.div>

      {/* Muhasaba summary */}
      {muhasaba && (
        <motion.div variants={item} className="glass-card p-5 space-y-3">
          <h3 className="text-text-primary text-sm font-medium">From your self-accounting</h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-lg font-light text-gold">
                {muhasaba.tasks_completed}/{muhasaba.tasks_total}
              </p>
              <p className="text-text-muted text-xs">tasks done</p>
            </div>
            <div>
              <p className="text-lg font-light text-gold">
                {muhasaba.time_drains?.length || 0}
              </p>
              <p className="text-text-muted text-xs">time drains</p>
            </div>
          </div>
          {muhasaba.time_drains && muhasaba.time_drains.length > 0 && (
            <div className="pt-2 border-t border-border-subtle">
              <p className="text-text-muted text-xs mb-1">Time drains identified:</p>
              {muhasaba.time_drains.map((drain, i) => (
                <p key={i} className="text-text-secondary text-sm">• {drain}</p>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Adjustments */}
      <motion.div variants={item} className="space-y-3">
        <label className="text-text-primary text-sm font-medium">
          What will you adjust for the next session?
        </label>
        <p className="text-text-muted text-xs">
          Be specific. &ldquo;Try harder&rdquo; is not an adjustment — &ldquo;put phone in another room&rdquo; is.
        </p>
        {adjustments.map((adj, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={adj}
              onChange={(e) =>
                setAdjustments(prev => prev.map((a, idx) => (idx === i ? e.target.value : a)))
              }
              placeholder="e.g. Shorten block to 45 min, move phone..."
              className="input-dark flex-1"
            />
            {adjustments.length > 1 && (
              <button
                onClick={() => setAdjustments(prev => prev.filter((_, idx) => idx !== i))}
                className="text-text-muted hover:text-text-secondary p-2"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setAdjustments(prev => [...prev, ''])}
          className="text-gold-dim hover:text-gold text-sm flex items-center gap-1 transition-colors"
        >
          <Plus size={14} /> Add adjustment
        </button>
      </motion.div>

      {/* Notes for next session */}
      <motion.div variants={item} className="space-y-3">
        <label className="text-text-primary text-sm font-medium">
          Notes for yourself
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything you want to remember for the next session..."
          className="textarea-dark"
          rows={3}
        />
      </motion.div>

      {/* Submit */}
      <motion.div variants={item} className="pt-2">
        <button onClick={handleSubmit} className="btn-gold w-full text-base">
          Continue to Mujahada
        </button>
      </motion.div>
    </motion.div>
  )
}
