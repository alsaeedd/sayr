'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import type { Session, MuhasabaData } from '@/lib/types'

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

export function Muhasaba({
  session,
  onComplete,
  initialData,
  submitLabel = 'Continue to Course Correction',
  onCancel,
}: {
  session: Session
  onComplete: (data: Record<string, unknown>) => void
  initialData?: MuhasabaData | null
  submitLabel?: string
  onCancel?: () => void
}) {
  const musharata = session.musharata
  const muraqaba = session.muraqaba
  const tasks = musharata?.tasks || []

  // Seed completion from initialData when editing — we stored `incomplete_tasks`
  // explicitly in handleSubmit, so reverse it to rebuild the boolean array.
  const seedCompletion = initialData
    ? tasks.map(t => !(initialData.incomplete_tasks ?? []).some(it => it.text === t.text))
    : tasks.map(() => false)
  const [taskCompletion, setTaskCompletion] = useState<boolean[]>(seedCompletion)
  const [timeDrains, setTimeDrains] = useState<string[]>(
    initialData?.time_drains?.length ? [...initialData.time_drains, ''] : [''],
  )
  const [reflection, setReflection] = useState(initialData?.reflection ?? '')

  const completedCount = taskCompletion.filter(Boolean).length

  const handleSubmit = () => {
    // Capture which specific tasks weren't done so Muataba can offer carry-forward.
    const incompleteTasks = tasks
      .map((t, i) => ({ task: t, done: taskCompletion[i] }))
      .filter(x => !x.done)
      .map(x => ({ text: x.task.text, bucket: x.task.bucket }))

    onComplete({
      tasks_completed: completedCount,
      tasks_total: tasks.length,
      time_drains: timeDrains.filter(t => t.trim()),
      reflection,
      incomplete_tasks: incompleteTasks,
    })
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 pt-4">
      {/* Principle */}
      <motion.div variants={fadeUp} className="glass-card p-5">
        <p className="text-text-secondary text-sm leading-relaxed italic">
          &ldquo;Account for yourselves before you are accounted for.&rdquo;
          <span className="text-text-muted block mt-1">— Umar ibn al-Khattab (ra)</span>
        </p>
      </motion.div>

      {/* Animated stat counters */}
      {muraqaba && (
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
          {[
            { value: muraqaba.duration_minutes, label: 'minutes worked' },
            { value: muraqaba.drift_count, label: 'drifts recorded' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              className="glass-card p-5 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1, type: 'spring', stiffness: 200, damping: 22 }}
            >
              <motion.p
                className="text-xl font-light text-gold"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                {stat.value}
              </motion.p>
              <p className="text-text-muted text-xs">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Per-block breakdown — full-day sessions only */}
      {muraqaba?.blocks && muraqaba.blocks.length > 0 && (
        <motion.div variants={fadeUp} className="glass-card p-4 space-y-2">
          <p className="text-text-muted text-[11px] uppercase tracking-[0.15em]">Per block</p>
          {muraqaba.blocks.map((b, i) => (
            <motion.div
              key={i}
              className="flex justify-between items-center text-xs"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.06 }}
            >
              <span className="text-text-secondary">{b.label}</span>
              <span className="text-text-muted tabular-nums">
                {b.duration_minutes}m · {b.drift_count} {b.drift_count === 1 ? 'drift' : 'drifts'}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Animated task checklist */}
      {tasks.length > 0 && (
        <motion.div variants={fadeUp} className="space-y-3">
          <label className="text-text-primary text-sm font-medium">
            Did you complete what you assigned?
          </label>
          {tasks.map((task, i) => (
            <motion.button
              key={i}
              onClick={() => setTaskCompletion(prev => prev.map((v, idx) => (idx === i ? !v : v)))}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                taskCompletion[i]
                  ? 'border-emerald-light/30 bg-emerald/[0.04]'
                  : 'border-border-subtle hover:border-border-accent'
              }`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 250, damping: 22 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                    taskCompletion[i]
                      ? 'border-emerald-light bg-emerald-light'
                      : 'border-text-muted'
                  }`}
                  animate={taskCompletion[i] ? {
                    scale: [1, 1.2, 1],
                    borderColor: '#40916c',
                    backgroundColor: '#40916c',
                  } : {
                    scale: 1,
                    borderColor: '#5a5650',
                    backgroundColor: 'transparent',
                  }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <AnimatePresence>
                    {taskCompletion[i] && (
                      <motion.svg
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        width="12" height="12" viewBox="0 0 12 12" fill="none"
                        className="check-draw"
                      >
                        <path d="M2 6L5 9L10 3" stroke="#0a0a0f" strokeWidth="2" strokeLinecap="round" />
                      </motion.svg>
                    )}
                  </AnimatePresence>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm transition-colors ${taskCompletion[i] ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {task.text}
                  </span>
                  {task.bucket && (
                    <span className="block text-[10px] text-gold-dim mt-0.5 uppercase tracking-wider">
                      {task.bucket}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
          <motion.p
            className="text-text-muted text-xs text-right"
            animate={{ color: completedCount === tasks.length ? '#40916c' : undefined }}
          >
            {completedCount}/{tasks.length} completed
          </motion.p>
        </motion.div>
      )}

      {/* Time drains */}
      <motion.div variants={fadeUp} className="space-y-3">
        <label className="text-text-primary text-sm font-medium">Where did you lose time?</label>
        <AnimatePresence mode="popLayout">
          {timeDrains.map((drain, i) => (
            <motion.div
              key={`drain-${i}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={drain}
                onChange={(e) => setTimeDrains(prev => prev.map((d, idx) => (idx === i ? e.target.value : d)))}
                placeholder="e.g. Checked phone for 10 min..."
                className="input-dark flex-1"
              />
              {timeDrains.length > 1 && (
                <motion.button
                  onClick={() => setTimeDrains(prev => prev.filter((_, idx) => idx !== i))}
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
          onClick={() => setTimeDrains(prev => [...prev, ''])}
          className="text-gold-dim hover:text-gold text-sm flex items-center gap-1"
          whileHover={{ x: 4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Plus size={14} /> Add time drain
        </motion.button>
      </motion.div>

      {/* Reflection */}
      <motion.div variants={fadeUp} className="space-y-3">
        <label className="text-text-primary text-sm font-medium">Brief reflection</label>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="How did this session go? One or two honest lines..."
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
