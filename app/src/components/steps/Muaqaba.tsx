'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import type { Session, MuaqabaData } from '@/lib/types'

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1, y: 0,
    transition: { type: 'spring' as const, stiffness: 180, damping: 22 },
  },
}

export function Muaqaba({
  session,
  onComplete,
  initialData,
  submitLabel = 'Continue to Mujahada',
  onCancel,
}: {
  session: Session
  onComplete: (data: Record<string, unknown>) => void
  initialData?: MuaqabaData | null
  submitLabel?: string
  onCancel?: () => void
}) {
  const muhasaba = session.muhasaba
  const [adjustments, setAdjustments] = useState<string[]>(
    initialData?.adjustments?.length ? [...initialData.adjustments, ''] : [''],
  )
  const [notes, setNotes] = useState(initialData?.notes ?? '')

  const handleSubmit = () => {
    onComplete({
      adjustments: adjustments.filter(a => a.trim()),
      notes,
    })
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 pt-4">
      {/* Principle */}
      <motion.div variants={fadeUp} className="glass-card p-5">
        <p className="text-text-secondary text-sm leading-relaxed italic">
          &ldquo;Mu&apos;aqaba is not anger at yourself. It is the response of a wise captain
          adjusting sails when the wind shifts. The destination doesn&apos;t change — the route does.&rdquo;
        </p>
      </motion.div>

      {/* Muhasaba summary with animated counters */}
      {muhasaba && (
        <motion.div variants={fadeUp} className="glass-card p-5 space-y-3">
          <h3 className="text-text-primary text-sm font-medium">From your self-accounting</h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              { value: `${muhasaba.tasks_completed}/${muhasaba.tasks_total}`, label: 'tasks done' },
              { value: muhasaba.time_drains?.length || 0, label: 'time drains' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <p className="text-lg font-light text-gold">{stat.value}</p>
                <p className="text-text-muted text-xs">{stat.label}</p>
              </motion.div>
            ))}
          </div>
          {muhasaba.time_drains && muhasaba.time_drains.length > 0 && (
            <motion.div
              className="pt-2 border-t border-border-subtle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-text-muted text-xs mb-1">Time drains identified:</p>
              {muhasaba.time_drains.map((drain, i) => (
                <motion.p
                  key={i}
                  className="text-text-secondary text-sm"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                >
                  • {drain}
                </motion.p>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Adjustments */}
      <motion.div variants={fadeUp} className="space-y-3">
        <label className="text-text-primary text-sm font-medium">
          What will you adjust for the next session?
        </label>
        <p className="text-text-muted text-xs">
          Be specific. &ldquo;Try harder&rdquo; is not an adjustment — &ldquo;put phone in another room&rdquo; is.
        </p>
        <AnimatePresence mode="popLayout">
          {adjustments.map((adj, i) => (
            <motion.div
              key={`adj-${i}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={adj}
                onChange={(e) => setAdjustments(prev => prev.map((a, idx) => (idx === i ? e.target.value : a)))}
                placeholder="e.g. Shorten block to 45 min, move phone..."
                className="input-dark flex-1"
              />
              {adjustments.length > 1 && (
                <motion.button
                  onClick={() => setAdjustments(prev => prev.filter((_, idx) => idx !== i))}
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
          onClick={() => setAdjustments(prev => [...prev, ''])}
          className="text-gold-dim hover:text-gold text-sm flex items-center gap-1"
          whileHover={{ x: 4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Plus size={14} /> Add adjustment
        </motion.button>
      </motion.div>

      {/* Notes */}
      <motion.div variants={fadeUp} className="space-y-3">
        <label className="text-text-primary text-sm font-medium">Notes for yourself</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything you want to remember for the next session..."
          className="textarea-dark"
          rows={3}
        />
      </motion.div>

      {/* Submit */}
      <motion.div variants={fadeUp} className="pt-2 space-y-2">
        <motion.button
          onClick={handleSubmit}
          className="btn-gold w-full text-base"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
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
