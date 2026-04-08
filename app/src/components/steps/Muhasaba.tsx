'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import type { Session } from '@/lib/types'

export function Muhasaba({
  session,
  onComplete,
}: {
  session: Session
  onComplete: (data: Record<string, unknown>) => void
}) {
  const musharata = session.musharata
  const muraqaba = session.muraqaba
  const tasks = musharata?.tasks || []

  const [taskCompletion, setTaskCompletion] = useState<boolean[]>(
    tasks.map(() => false)
  )
  const [timeDrains, setTimeDrains] = useState<string[]>([''])
  const [reflection, setReflection] = useState('')

  const completedCount = taskCompletion.filter(Boolean).length

  const handleSubmit = () => {
    onComplete({
      tasks_completed: completedCount,
      tasks_total: tasks.length,
      time_drains: timeDrains.filter(t => t.trim()),
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
          &ldquo;Account for yourselves before you are accounted for.&rdquo;
          <span className="text-text-muted block mt-1">— Umar ibn al-Khattab (ra)</span>
        </p>
      </motion.div>

      {/* Session stats */}
      {muraqaba && (
        <motion.div variants={item} className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-light text-gold">{muraqaba.duration_minutes}</p>
            <p className="text-text-muted text-xs">minutes worked</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-light text-gold">{muraqaba.drift_count}</p>
            <p className="text-text-muted text-xs">drifts recorded</p>
          </div>
        </motion.div>
      )}

      {/* Task checklist */}
      {tasks.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <label className="text-text-primary text-sm font-medium">
            Did you complete what you assigned?
          </label>
          {tasks.map((task, i) => (
            <button
              key={i}
              onClick={() =>
                setTaskCompletion(prev =>
                  prev.map((v, idx) => (idx === i ? !v : v))
                )
              }
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                taskCompletion[i]
                  ? 'border-emerald-light/30 bg-emerald/5'
                  : 'border-border-subtle hover:border-border-accent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    taskCompletion[i]
                      ? 'border-emerald-light bg-emerald-light'
                      : 'border-text-muted'
                  }`}
                >
                  {taskCompletion[i] && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="#0a0a0f" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${taskCompletion[i] ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {task.text}
                </span>
              </div>
            </button>
          ))}
          <p className="text-text-muted text-xs text-right">
            {completedCount}/{tasks.length} completed
          </p>
        </motion.div>
      )}

      {/* Time drains */}
      <motion.div variants={item} className="space-y-3">
        <label className="text-text-primary text-sm font-medium">
          Where did you lose time?
        </label>
        {timeDrains.map((drain, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={drain}
              onChange={(e) =>
                setTimeDrains(prev => prev.map((d, idx) => (idx === i ? e.target.value : d)))
              }
              placeholder="e.g. Checked phone for 10 min..."
              className="input-dark flex-1"
            />
            {timeDrains.length > 1 && (
              <button
                onClick={() => setTimeDrains(prev => prev.filter((_, idx) => idx !== i))}
                className="text-text-muted hover:text-text-secondary p-2"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setTimeDrains(prev => [...prev, ''])}
          className="text-gold-dim hover:text-gold text-sm flex items-center gap-1 transition-colors"
        >
          <Plus size={14} /> Add time drain
        </button>
      </motion.div>

      {/* Reflection */}
      <motion.div variants={item} className="space-y-3">
        <label className="text-text-primary text-sm font-medium">
          Brief reflection
        </label>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="How did this session go? One or two honest lines..."
          className="textarea-dark"
          rows={3}
        />
      </motion.div>

      {/* Submit */}
      <motion.div variants={item} className="pt-2">
        <button onClick={handleSubmit} className="btn-gold w-full text-base">
          Continue to Course Correction
        </button>
      </motion.div>
    </motion.div>
  )
}
