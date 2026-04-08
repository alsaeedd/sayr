'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, LogOut, Clock, CheckCircle2, Trash2, X, SlidersHorizontal } from 'lucide-react'
import { LoadingScreen } from '@/components/LoadingScreen'
import type { Session } from '@/lib/types'

const STEP_NAMES = ['Musharata', 'Muraqaba', 'Muhasaba', "Mu'aqaba", 'Mujahada', "Mu'ataba"]

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
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

function getGreeting(): { salaam: string; arabic: string; note: string } {
  const hour = new Date().getHours()
  if (hour < 6) return {
    salaam: 'Peace in the stillness',
    arabic: 'السلام عليكم',
    note: 'The last third of the night — a blessed time.',
  }
  if (hour < 12) return {
    salaam: 'Good morning',
    arabic: 'صباح الخير',
    note: 'Begin with Bismillah and intention.',
  }
  if (hour < 16) return {
    salaam: 'Good afternoon',
    arabic: 'السلام عليكم',
    note: 'Stay steady. The nafs tires before the body does.',
  }
  if (hour < 19) return {
    salaam: 'Good evening',
    arabic: 'مساء الخير',
    note: 'The day is winding down. What remains?',
  }
  return {
    salaam: 'Peace this evening',
    arabic: 'السلام عليكم',
    note: 'Reflect gently on what was accomplished.',
  }
}

export function DashboardClient({
  userId,
  displayName,
  sessions: initialSessions,
}: {
  userId: string
  displayName: string
  sessions: Session[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const greeting = useMemo(() => getGreeting(), [])

  const [sessions, setSessions] = useState(initialSessions)
  const [showNameInput, setShowNameInput] = useState(false)

  // Auto-open name input if redirected with ?new=1
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowNameInput(true)
      // Clean the URL
      router.replace('/dashboard', { scroll: false })
    }
  }, [searchParams, router])
  const [sessionName, setSessionName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [navigating, setNavigating] = useState(false)

  const startNewSession = async () => {
    // Only auto-complete sessions that have actually finished mu'ataba (have the data)
    const fullyDone = sessions.filter(
      s => s.status === 'active' && s.muataba !== null
    )
    if (fullyDone.length > 0) {
      await Promise.all(
        fullyDone.map(s =>
          supabase
            .from('sessions')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', s.id)
        )
      )
      setSessions(prev =>
        prev.map(s =>
          fullyDone.some(a => a.id === s.id)
            ? { ...s, status: 'completed' as const, completed_at: new Date().toISOString() }
            : s
        )
      )
    }

    setNavigating(true)
    const name = sessionName.trim()
    const params = name ? `?name=${encodeURIComponent(name)}` : ''
    router.push(`/session/new${params}`)
  }

  const handleNewClick = () => {
    setShowNameInput(true)
    setSessionName('')
  }

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startNewSession()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('sessions').delete().eq('id', id)
    setSessions(prev => prev.filter(s => s.id !== id))
    setDeletingId(null)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const activeSessions = sessions.filter(s => s.status === 'active')
  const completedSessions = sessions.filter(s => s.status === 'completed')
  const totalCompleted = completedSessions.length

  return (
    <main className="flex-1 flex flex-col min-h-screen">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between px-8 py-5 border-b border-border-subtle relative z-10"
      >
        <a href="/dashboard" className="flex items-baseline gap-2 hover:opacity-80 transition-opacity">
          <p className="arabic text-gold text-sm leading-none">سَيْر</p>
          <h1 className="text-lg font-light text-text-primary tracking-[-0.02em]">Sayr</h1>
        </a>
        <div className="flex items-center gap-3">
          <span className="text-text-muted text-sm">{displayName}</span>
          <a
            href="/settings"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-secondary hover:bg-bg-elevated/50 transition-all"
          >
            <SlidersHorizontal size={15} />
          </a>
          <motion.button
            onClick={handleSignOut}
            className="text-text-muted hover:text-text-secondary transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <LogOut size={16} />
          </motion.button>
        </div>
      </motion.header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full relative z-10">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="w-full space-y-10"
        >
          {/* Time-aware greeting */}
          <motion.div variants={fadeUp} className="text-center space-y-6">
            <div className="space-y-3">
              <motion.p
                className="arabic text-gold/60 text-base"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                {greeting.arabic}
              </motion.p>
              <h2 className="text-3xl font-light text-text-primary tracking-[-0.02em]">
                {greeting.salaam}, {displayName.split(' ')[0]}
              </h2>
              <p className="text-text-secondary text-sm italic">
                {greeting.note}
              </p>
            </div>

            {totalCompleted > 0 && (
              <motion.p
                className="text-text-muted text-sm tracking-wide"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {totalCompleted} {totalCompleted === 1 ? 'session' : 'sessions'} walked
              </motion.p>
            )}

            {/* New session — name input or button */}
            <AnimatePresence mode="wait" initial={false}>
              {!showNameInput ? (
                <motion.button
                  key="new-btn"
                  onClick={handleNewClick}
                  className="btn-gold inline-flex items-center gap-2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Plus size={18} />
                  New Work Session
                </motion.button>
              ) : (
                <motion.form
                  key="name-form"
                  onSubmit={handleNameSubmit}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto"
                >
                  <input
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="Name this session (optional)"
                    className="input-dark text-center"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <motion.button
                      type="submit"
                      className="btn-gold inline-flex items-center gap-2"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Plus size={18} />
                      Begin
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => setShowNameInput(false)}
                      className="btn-ghost inline-flex items-center gap-1"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Active sessions */}
          {activeSessions.length > 0 && (
            <motion.div variants={fadeUp} className="space-y-3">
              <h3 className="text-text-muted text-xs uppercase tracking-[0.1em] font-medium">
                Continue
              </h3>
              <AnimatePresence>
                {activeSessions.map((session, idx) => (
                  <motion.div
                    key={session.id}
                    className="relative group"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 22,
                      delay: idx * 0.08,
                    }}
                  >
                    <motion.button
                      onClick={() => { setNavigating(true); router.push(`/session/${session.id}`) }}
                      className="glass-card-gold w-full p-4 text-left cursor-pointer"
                      whileHover={{
                        scale: 1.01,
                        boxShadow: '0 0 40px -8px rgba(212, 175, 55, 0.1)',
                      }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-text-primary text-sm font-medium">
                            {session.name || `Step ${session.current_step}: ${STEP_NAMES[session.current_step - 1]}`}
                          </p>
                          <p className="text-text-muted text-xs mt-1">
                            {session.name
                              ? `Step ${session.current_step}: ${STEP_NAMES[session.current_step - 1]} · `
                              : ''}
                            {new Date(session.started_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div
                              key={i}
                              className={`step-dot ${
                                i < session.current_step - 1
                                  ? 'completed'
                                  : i === session.current_step - 1
                                  ? 'active'
                                  : ''
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.button>
                    {/* Delete button — appears on hover */}
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); setDeletingId(session.id) }}
                      className="absolute -right-2 -top-2 w-7 h-7 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center text-text-muted hover:text-red-400 hover:border-red-400/30 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={14} />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Completed sessions */}
          {completedSessions.length > 0 && (
            <motion.div variants={fadeUp} className="space-y-3">
              <h3 className="text-text-muted text-xs uppercase tracking-[0.1em] font-medium">
                Past Sessions
              </h3>
              <AnimatePresence>
                {completedSessions.slice(0, 5).map((session, idx) => (
                  <motion.div
                    key={session.id}
                    className="glass-card p-5 flex items-center justify-between group relative"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 22,
                      delay: idx * 0.06,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 + idx * 0.06 }}
                      >
                        <CheckCircle2 size={14} className="text-emerald-light" />
                      </motion.div>
                      <div>
                        <p className="text-text-primary text-sm">
                          {session.name || 'Completed'}
                        </p>
                        <p className="text-text-muted text-xs">
                          {new Date(session.started_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {session.session_duration_minutes && (
                        <div className="flex items-center gap-1 text-text-muted text-xs">
                          <Clock size={11} />
                          {session.session_duration_minutes}m
                        </div>
                      )}
                      <button
                        onClick={() => setDeletingId(session.id)}
                        className="text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Empty state */}
          {sessions.length === 0 && (
            <motion.div variants={fadeUp} className="text-center py-16 space-y-4">
              <motion.p
                className="arabic text-gold/30 text-3xl"
                animate={{
                  opacity: [0.3, 0.5, 0.3],
                  scale: [1, 1.02, 1],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                style={{ textShadow: '0 0 20px rgba(212, 175, 55, 0.1)' }}
              >
                بسم الله
              </motion.p>
              <p className="text-text-muted text-sm max-w-xs mx-auto leading-relaxed">
                Your first session awaits. Each one is a small journey — from intention to reflection.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deletingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            onClick={() => setDeletingId(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="glass-card p-6 max-w-xs w-full text-center space-y-4 relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-text-primary text-sm font-medium">Delete this session?</p>
              <p className="text-text-muted text-xs">This cannot be undone.</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleDelete(deletingId)}
                  className="px-5 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeletingId(null)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation loading overlay */}
      <AnimatePresence>
        {navigating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <LoadingScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
