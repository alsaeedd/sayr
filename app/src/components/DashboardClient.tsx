'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, LogOut, Clock, CheckCircle2 } from 'lucide-react'
import type { Session } from '@/lib/types'

const STEP_NAMES = ['Musharata', 'Muraqaba', 'Muhasaba', "Mu'aqaba", 'Mujahada', "Mu'ataba"]

export function DashboardClient({
  userId,
  displayName,
  sessions,
}: {
  userId: string
  displayName: string
  sessions: Session[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const startNewSession = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .insert({ user_id: userId, current_step: 1, status: 'active' })
      .select()
      .single()

    if (!error && data) {
      router.push(`/session/${data.id}`)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const activeSessions = sessions.filter(s => s.status === 'active')
  const completedSessions = sessions.filter(s => s.status === 'completed')

  return (
    <main className="flex-1 flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-border-subtle">
        <div>
          <p className="arabic text-gold text-sm">سَيْر</p>
          <h1 className="text-xl font-light text-text-primary">Sayr</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-text-secondary text-sm">
            Assalamu Alaikum, {displayName}
          </span>
          <button onClick={handleSignOut} className="text-text-muted hover:text-text-secondary transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-6 py-12 max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full space-y-10"
        >
          {/* New session button */}
          <div className="text-center space-y-6">
            <div>
              <h2 className="text-2xl font-light text-text-primary mb-2">Ready to begin?</h2>
              <p className="text-text-secondary text-sm">
                Each work session follows Al-Ghazali&apos;s six steps — from intention to reflection.
              </p>
            </div>
            <button onClick={startNewSession} className="btn-gold inline-flex items-center gap-2 text-base">
              <Plus size={20} />
              New Work Session
            </button>
          </div>

          {/* Active sessions */}
          {activeSessions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-text-secondary text-xs uppercase tracking-wider font-medium">
                Active Sessions
              </h3>
              {activeSessions.map((session) => (
                <motion.button
                  key={session.id}
                  onClick={() => router.push(`/session/${session.id}`)}
                  className="glass-card-gold w-full p-5 text-left hover:border-gold/30 transition-colors cursor-pointer"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-text-primary font-medium">
                        Step {session.current_step}: {STEP_NAMES[session.current_step - 1]}
                      </p>
                      <p className="text-text-muted text-sm mt-1">
                        Started {new Date(session.started_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
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
              ))}
            </div>
          )}

          {/* Completed sessions */}
          {completedSessions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-text-secondary text-xs uppercase tracking-wider font-medium">
                Past Sessions
              </h3>
              {completedSessions.slice(0, 5).map((session) => (
                <div key={session.id} className="glass-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-emerald-light" />
                    <div>
                      <p className="text-text-primary text-sm">Completed</p>
                      <p className="text-text-muted text-xs">
                        {new Date(session.started_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {session.session_duration_minutes && (
                    <div className="flex items-center gap-1 text-text-muted text-xs">
                      <Clock size={12} />
                      {session.session_duration_minutes}m
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {sessions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-text-muted text-sm">
                No sessions yet. Start your first work session above.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  )
}
