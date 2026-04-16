'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import type { Session, MujuhadaData } from '@/lib/types'

const COMMON_LIES = [
  '"Just check it quickly"',
  '"You deserve a break" (after 15 min)',
  '"This other thing is more urgent"',
  '"You\'re going to fail anyway"',
  '"You can do it later"',
]

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

export function Mujahada({
  session,
  onComplete,
  initialData,
  submitLabel = 'Continue to Final Step',
  onCancel,
}: {
  session: Session
  onComplete: (data: Record<string, unknown>) => void
  initialData?: MujuhadaData | null
  submitLabel?: string
  onCancel?: () => void
}) {
  const [nafsLies, setNafsLies] = useState<string[]>(
    initialData?.nafs_lies?.length ? [...initialData.nafs_lies, ''] : [''],
  )
  const [strategies, setStrategies] = useState<string[]>(
    initialData?.strategies?.length ? [...initialData.strategies, ''] : [''],
  )
  const [reflection, setReflection] = useState(initialData?.reflection ?? '')
  const [selectedLies, setSelectedLies] = useState<Set<string>>(
    () => new Set(initialData?.nafs_lies?.filter(l => COMMON_LIES.includes(l)) ?? []),
  )

  const handleChipClick = (lie: string) => {
    if (selectedLies.has(lie)) return
    setSelectedLies(prev => new Set(prev).add(lie))
    setNafsLies(prev => {
      const filtered = prev.filter(l => l.trim())
      return [...filtered, lie]
    })
  }

  const handleSubmit = () => {
    onComplete({
      nafs_lies: nafsLies.filter(l => l.trim()),
      strategies: strategies.filter(s => s.trim()),
      reflection,
    })
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 pt-4">
      {/* Principle */}
      <motion.div variants={fadeUp} className="glass-card p-5">
        <p className="text-text-secondary text-sm leading-relaxed italic">
          &ldquo;The mujahid is the one who strives against his own nafs.&rdquo;
          <span className="text-text-muted block mt-1">— The Prophet (peace be upon him)</span>
        </p>
        <p className="text-text-muted text-xs mt-3">
          Mujahada is effort at the point of resistance — the push to get the wheel turning,
          not the force to keep it spinning.
        </p>
      </motion.div>

      {/* Common lies — animated chip selection */}
      <motion.div variants={fadeUp} className="space-y-3">
        <label className="text-text-primary text-sm font-medium">
          What lies did your nafs tell you today?
        </label>
        <motion.div
          className="flex flex-wrap gap-2 mb-2"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.2 } } }}
        >
          {COMMON_LIES.map((lie, i) => (
            <motion.button
              key={i}
              variants={{
                hidden: { opacity: 0, scale: 0.9 },
                show: { opacity: 1, scale: 1 },
              }}
              onClick={() => handleChipClick(lie)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                selectedLies.has(lie)
                  ? 'border-gold/30 bg-gold/10 text-gold'
                  : 'border-border-subtle text-text-muted hover:border-gold-dim hover:text-text-secondary'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={selectedLies.has(lie) ? {
                boxShadow: ['0 0 0 0 rgba(212, 175, 55, 0.2)', '0 0 12px 2px rgba(212, 175, 55, 0)', '0 0 0 0 rgba(212, 175, 55, 0)'],
              } : {}}
              transition={{ duration: 0.4 }}
            >
              {lie}
            </motion.button>
          ))}
        </motion.div>

        <AnimatePresence mode="popLayout">
          {nafsLies.map((lie, i) => (
            <motion.div
              key={`lie-${i}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={lie}
                onChange={(e) => setNafsLies(prev => prev.map((l, idx) => (idx === i ? e.target.value : l)))}
                placeholder="What did your nafs whisper?"
                className="input-dark flex-1"
              />
              {nafsLies.length > 1 && (
                <motion.button
                  onClick={() => {
                    setNafsLies(prev => prev.filter((_, idx) => idx !== i))
                    // Deselect chip if it was a common lie
                    if (COMMON_LIES.includes(lie)) {
                      setSelectedLies(prev => {
                        const next = new Set(prev)
                        next.delete(lie)
                        return next
                      })
                    }
                  }}
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
          onClick={() => setNafsLies(prev => [...prev, ''])}
          className="text-gold-dim hover:text-gold text-sm flex items-center gap-1"
          whileHover={{ x: 4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Plus size={14} /> Add lie
        </motion.button>
      </motion.div>

      {/* Strategies */}
      <motion.div variants={fadeUp} className="space-y-3">
        <label className="text-text-primary text-sm font-medium">Pre-commit your response</label>
        <p className="text-text-muted text-xs">&ldquo;When my nafs says X, I will do Y.&rdquo;</p>
        <AnimatePresence mode="popLayout">
          {strategies.map((strategy, i) => (
            <motion.div
              key={`strat-${i}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={strategy}
                onChange={(e) => setStrategies(prev => prev.map((s, idx) => (idx === i ? e.target.value : s)))}
                placeholder="e.g. When I want to check my phone → 5 min rule"
                className="input-dark flex-1"
              />
              {strategies.length > 1 && (
                <motion.button
                  onClick={() => setStrategies(prev => prev.filter((_, idx) => idx !== i))}
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
          onClick={() => setStrategies(prev => [...prev, ''])}
          className="text-gold-dim hover:text-gold text-sm flex items-center gap-1"
          whileHover={{ x: 4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Plus size={14} /> Add strategy
        </motion.button>
      </motion.div>

      {/* Reflection */}
      <motion.div variants={fadeUp} className="space-y-3">
        <label className="text-text-primary text-sm font-medium">Reflection on your striving</label>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Where was the resistance strongest? Where did you push through?"
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
