'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, RotateCcw, Moon } from 'lucide-react'
import { GoldenParticles } from '@/components/GoldenParticles'
import type { Session } from '@/lib/types'

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

const CLOSING_DHIKR = [
  { ar: 'أستغفر الله', en: 'Istighfar for what was wasted' },
  { ar: 'الحمد لله', en: 'Shukr for what was accomplished' },
  { ar: 'توكلت على الله', en: 'Tawakkul for what remains' },
]

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

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 pt-4">
      {/* Principle */}
      <motion.div variants={fadeUp} className="glass-card p-5">
        <p className="text-text-secondary text-sm leading-relaxed italic">
          &ldquo;Mu&apos;ataba is gentle reproach — disappointment expressed with love,
          like a parent to a child, not like a tyrant to a prisoner.&rdquo;
        </p>
        <p className="text-text-muted text-xs mt-2">
          Harsh self-reproach leads to despair, which is itself a greater sin
          than the laziness it was trying to correct.
        </p>
      </motion.div>

      {/* Done for the day? — animated choice cards */}
      <AnimatePresence>
        {isDoneForDay === null && (
          <motion.div
            variants={fadeUp}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            className="space-y-4"
          >
            <p className="text-text-primary text-sm font-medium text-center">
              Are you done for the day?
            </p>
            <p className="text-text-muted text-xs text-center">
              Mu&apos;ataba — the gentle end-of-day review — only makes sense when you&apos;re wrapping up.
            </p>
            <div className="flex gap-3">
              <motion.button
                onClick={() => setIsDoneForDay(true)}
                className="flex-1 glass-card-gold p-4 text-center"
                whileHover={{
                  scale: 1.03,
                  boxShadow: '0 0 30px -6px rgba(212, 175, 55, 0.15)',
                }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Moon size={22} className="text-gold mx-auto mb-2" />
                </motion.div>
                <p className="text-text-primary text-sm font-medium">Yes, I&apos;m done</p>
                <p className="text-text-muted text-xs mt-1">End-of-day review</p>
              </motion.button>
              <motion.button
                onClick={onStartNewSession}
                className="flex-1 glass-card p-5 text-center"
                whileHover={{
                  scale: 1.03,
                  boxShadow: '0 0 30px -6px rgba(64, 145, 108, 0.12)',
                }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.div
                  animate={{ rotate: [0, -15, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <RotateCcw size={22} className="text-emerald-light mx-auto mb-2" />
                </motion.div>
                <p className="text-text-primary text-sm font-medium">Not yet</p>
                <p className="text-text-muted text-xs mt-1">Start another session</p>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End of day review — smooth reveal */}
      <AnimatePresence>
        {isDoneForDay && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 150, damping: 20 }}
          >
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } }}
              className="space-y-6"
            >
              {/* Patterns */}
              <motion.div variants={fadeUp} className="space-y-3">
                <label className="text-text-primary text-sm font-medium">
                  What patterns did you notice today?
                </label>
                <p className="text-text-muted text-xs">
                  Look for recurring themes, not isolated incidents.
                </p>
                <AnimatePresence mode="popLayout">
                  {patterns.map((pattern, i) => (
                    <motion.div
                      key={`pattern-${i}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={pattern}
                        onChange={(e) => setPatterns(prev => prev.map((p, idx) => (idx === i ? e.target.value : p)))}
                        placeholder='e.g. "I lose focus after 45 min consistently"'
                        className="input-dark flex-1"
                      />
                      {patterns.length > 1 && (
                        <motion.button
                          onClick={() => setPatterns(prev => prev.filter((_, idx) => idx !== i))}
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
                  onClick={() => setPatterns(prev => [...prev, ''])}
                  className="text-gold-dim hover:text-gold text-sm flex items-center gap-1"
                  whileHover={{ x: 4 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <Plus size={14} /> Add pattern
                </motion.button>
              </motion.div>

              {/* One change */}
              <motion.div variants={fadeUp} className="space-y-3">
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
              </motion.div>

              {/* Gratitude */}
              <motion.div variants={fadeUp} className="space-y-3">
                <label className="text-text-primary text-sm font-medium">End with gratitude</label>
                <textarea
                  value={gratitude}
                  onChange={(e) => setGratitude(e.target.value)}
                  placeholder="What are you grateful for today? What did Allah make easy for you?"
                  className="textarea-dark"
                  rows={3}
                />
              </motion.div>

              {/* Closing dhikr — ceremonial sequence with building radiance */}
              <motion.div
                variants={fadeUp}
                className="text-center space-y-6 py-8 relative"
              >
                {/* Ambient radiance that builds with each dhikr */}
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5, duration: 2 }}
                  style={{
                    background: 'radial-gradient(circle, rgba(212, 175, 55, 0.04) 0%, transparent 60%)',
                  }}
                />

                <div className="ornament-divider text-xs">closing</div>

                {CLOSING_DHIKR.map((dhikr, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.8 + i * 0.5,
                      type: 'spring',
                      stiffness: 100,
                      damping: 18,
                    }}
                    className="space-y-1.5 relative"
                  >
                    <motion.p
                      className="arabic text-gold text-xl"
                      initial={{
                        textShadow: '0 0 0px rgba(212, 175, 55, 0)',
                        scale: 0.98,
                      }}
                      animate={{
                        textShadow: `0 0 ${24 + i * 8}px rgba(212, 175, 55, ${0.2 + i * 0.08})`,
                        scale: 1,
                      }}
                      transition={{ delay: 1 + i * 0.5, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {dhikr.ar}
                    </motion.p>
                    <motion.p
                      className="text-text-muted text-xs"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.7 }}
                      transition={{ delay: 1.2 + i * 0.5, duration: 0.6 }}
                    >
                      {dhikr.en}
                    </motion.p>
                  </motion.div>
                ))}

                {/* Particles emerge after all three dhikr */}
                <motion.div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.8, duration: 0.5 }}
                >
                  <GoldenParticles count={18} speed={0.5} />
                </motion.div>
              </motion.div>

              {/* Submit */}
              <motion.div variants={fadeUp} className="pt-2">
                <motion.button
                  onClick={handleSubmit}
                  className="btn-gold w-full"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Complete Day
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
