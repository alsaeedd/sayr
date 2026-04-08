'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, RotateCcw, Moon } from 'lucide-react'
import type { Session } from '@/lib/types'

export function Muataba({
  session,
  onComplete,
  onStartNewSession,
}: {
  session: Session
  onComplete: (data: Record<string, unknown>) => void
  onStartNewSession: () => void
}) {
  const [isDoneForDay, setIsDoneForDay] = useState<boolean | null>(null)
  const [patterns, setPatterns] = useState<string[]>([''])
  const [changeForTomorrow, setChangeForTomorrow] = useState('')
  const [gratitude, setGratitude] = useState('')

  const handleSubmit = () => {
    onComplete({
      patterns: patterns.filter(p => p.trim()),
      change_for_tomorrow: changeForTomorrow,
      gratitude,
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
          &ldquo;Mu&apos;ataba is gentle reproach — disappointment expressed with love,
          like a parent to a child, not like a tyrant to a prisoner.&rdquo;
        </p>
        <p className="text-text-muted text-xs mt-2">
          Harsh self-reproach leads to despair, which is itself a greater sin
          than the laziness it was trying to correct.
        </p>
      </motion.div>

      {/* Are you done for the day? */}
      {isDoneForDay === null && (
        <motion.div variants={item} className="space-y-4">
          <p className="text-text-primary text-sm font-medium text-center">
            Are you done for the day?
          </p>
          <p className="text-text-muted text-xs text-center">
            Mu&apos;ataba — the gentle end-of-day review — only makes sense when you&apos;re wrapping up.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setIsDoneForDay(true)}
              className="flex-1 glass-card-gold p-4 text-center hover:border-gold/30 transition-all"
            >
              <Moon size={20} className="text-gold mx-auto mb-2" />
              <p className="text-text-primary text-sm font-medium">Yes, I&apos;m done</p>
              <p className="text-text-muted text-xs mt-1">End-of-day review</p>
            </button>
            <button
              onClick={onStartNewSession}
              className="flex-1 glass-card p-4 text-center hover:border-emerald-light/30 transition-all"
            >
              <RotateCcw size={20} className="text-emerald-light mx-auto mb-2" />
              <p className="text-text-primary text-sm font-medium">Not yet</p>
              <p className="text-text-muted text-xs mt-1">Start another session</p>
            </button>
          </div>
        </motion.div>
      )}

      {/* End of day review */}
      <AnimatePresence>
        {isDoneForDay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-8"
          >
            {/* Patterns */}
            <div className="space-y-3">
              <label className="text-text-primary text-sm font-medium">
                What patterns did you notice today?
              </label>
              <p className="text-text-muted text-xs">
                Look for recurring themes, not isolated incidents.
              </p>
              {patterns.map((pattern, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={pattern}
                    onChange={(e) =>
                      setPatterns(prev =>
                        prev.map((p, idx) => (idx === i ? e.target.value : p))
                      )
                    }
                    placeholder='e.g. "I lose focus after 45 min consistently"'
                    className="input-dark flex-1"
                  />
                  {patterns.length > 1 && (
                    <button
                      onClick={() =>
                        setPatterns(prev => prev.filter((_, idx) => idx !== i))
                      }
                      className="text-text-muted hover:text-text-secondary p-2"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setPatterns(prev => [...prev, ''])}
                className="text-gold-dim hover:text-gold text-sm flex items-center gap-1 transition-colors"
              >
                <Plus size={14} /> Add pattern
              </button>
            </div>

            {/* One change for tomorrow */}
            <div className="space-y-3">
              <label className="text-text-primary text-sm font-medium">
                One specific change for tomorrow&apos;s musharata
              </label>
              <p className="text-text-muted text-xs">Just one. Not ten.</p>
              <input
                type="text"
                value={changeForTomorrow}
                onChange={(e) => setChangeForTomorrow(e.target.value)}
                placeholder="e.g. Shorten work blocks to 45 min"
                className="input-dark"
              />
            </div>

            {/* Gratitude + Istighfar */}
            <div className="space-y-3">
              <label className="text-text-primary text-sm font-medium">
                End with gratitude
              </label>
              <textarea
                value={gratitude}
                onChange={(e) => setGratitude(e.target.value)}
                placeholder="What are you grateful for today? What did Allah make easy for you?"
                className="textarea-dark"
                rows={3}
              />
            </div>

            {/* Closing dhikr */}
            <div className="text-center space-y-3 py-4">
              <div className="ornament-divider text-xs">closing</div>
              <div className="space-y-2">
                <p className="arabic text-gold text-lg">أستغفر الله</p>
                <p className="text-text-muted text-xs">Istighfar for what was wasted</p>
              </div>
              <div className="space-y-2">
                <p className="arabic text-gold text-lg">الحمد لله</p>
                <p className="text-text-muted text-xs">Shukr for what was accomplished</p>
              </div>
              <div className="space-y-2">
                <p className="arabic text-gold text-lg">توكلت على الله</p>
                <p className="text-text-muted text-xs">Tawakkul for what remains</p>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button onClick={handleSubmit} className="btn-gold w-full text-base">
                Complete Day
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
