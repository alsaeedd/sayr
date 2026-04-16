'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Clock, Target, AlertTriangle, Wrench, Swords, Heart } from 'lucide-react'
import type { Session } from '@/lib/types'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 180, damping: 22 },
  },
}

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

export function SessionReview({ session }: { session: Session }) {
  const { musharata, muraqaba, muhasaba, muaqaba, mujahada, muataba } = session
  const completedDate = session.completed_at
    ? new Date(session.completed_at).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <main className="flex-1 flex flex-col min-h-screen">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-8 py-5 border-b border-border-subtle relative z-10"
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <a
            href="/dashboard"
            className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Dashboard</span>
          </a>
          <div className="text-right">
            <p className="text-text-primary text-sm font-medium">{session.name || 'Session'}</p>
            <p className="text-text-muted text-xs">
              {completedDate}
              {session.session_duration_minutes
                ? ` · ${session.session_duration_minutes}m`
                : ''}
            </p>
          </div>
        </div>
      </motion.header>

      <div className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full relative z-10 pb-24">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* ── Musharata ── */}
          {musharata && (
            <Section icon={Target} title="Musharata" subtitle="Contract">
              {musharata.tasks.length > 0 && (
                <div className="space-y-1">
                  <Label>Tasks</Label>
                  {musharata.tasks.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-gold mt-0.5">·</span>
                      <span>{t.text}</span>
                      {t.bucket && (
                        <span className="text-gold/60 text-[10px] uppercase tracking-wider ml-auto shrink-0">
                          {t.bucket}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-4 text-xs text-text-muted pt-1">
                <span>{musharata.time_block_start} — {musharata.time_block_end}</span>
                {musharata.mode === 'full_day' && musharata.blocks && (
                  <span>{musharata.blocks.length} blocks</span>
                )}
              </div>
              {musharata.avoidances.length > 0 && (
                <Chips label="Avoidances" items={musharata.avoidances} />
              )}
              {musharata.boundaries.length > 0 && (
                <Chips label="Boundaries" items={musharata.boundaries} variant="emerald" />
              )}
            </Section>
          )}

          {/* ── Muraqaba ── */}
          {muraqaba && !('status' in muraqaba && muraqaba.status === 'in_progress') && (
            <Section icon={Clock} title="Muraqaba" subtitle="Focus">
              <div className="grid grid-cols-2 gap-3 text-center">
                <StatBox value={`${muraqaba.duration_minutes}`} label="minutes" />
                <StatBox value={`${muraqaba.drift_count}`} label="drifts" />
              </div>
              {muraqaba.blocks && muraqaba.blocks.length > 0 && (
                <div className="space-y-1">
                  <Label>Per block</Label>
                  {muraqaba.blocks.map((b, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-text-secondary">{b.label}</span>
                      <span className="text-text-muted tabular-nums">
                        {b.duration_minutes}m · {b.drift_count} drifts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* ── Muhasaba ── */}
          {muhasaba && (
            <Section icon={Target} title="Muhasaba" subtitle="Self-accounting">
              <div className="grid grid-cols-2 gap-3 text-center">
                <StatBox
                  value={`${muhasaba.tasks_completed}/${muhasaba.tasks_total}`}
                  label="tasks done"
                />
                <StatBox
                  value={`${muhasaba.time_drains?.length || 0}`}
                  label="time drains"
                />
              </div>
              {muhasaba.time_drains && muhasaba.time_drains.length > 0 && (
                <div className="space-y-1">
                  <Label>Time drains</Label>
                  {muhasaba.time_drains.map((d, i) => (
                    <p key={i} className="text-text-secondary text-sm">• {d}</p>
                  ))}
                </div>
              )}
              {muhasaba.reflection && (
                <div>
                  <Label>Reflection</Label>
                  <p className="text-text-secondary text-sm italic">{muhasaba.reflection}</p>
                </div>
              )}
            </Section>
          )}

          {/* ── Mu'aqaba ── */}
          {muaqaba && (
            <Section icon={Wrench} title="Mu'aqaba" subtitle="Course correction">
              {muaqaba.adjustments.length > 0 && (
                <div className="space-y-1">
                  <Label>Adjustments</Label>
                  {muaqaba.adjustments.map((a, i) => (
                    <p key={i} className="text-text-secondary text-sm">• {a}</p>
                  ))}
                </div>
              )}
              {muaqaba.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-text-secondary text-sm italic">{muaqaba.notes}</p>
                </div>
              )}
            </Section>
          )}

          {/* ── Mujahada ── */}
          {mujahada && (
            <Section icon={Swords} title="Mujahada" subtitle="Striving">
              {mujahada.nafs_lies.length > 0 && (
                <Chips label="Nafs lies" items={mujahada.nafs_lies} />
              )}
              {mujahada.strategies.length > 0 && (
                <div className="space-y-1">
                  <Label>Strategies</Label>
                  {mujahada.strategies.map((s, i) => (
                    <p key={i} className="text-text-secondary text-sm">• {s}</p>
                  ))}
                </div>
              )}
              {mujahada.reflection && (
                <div>
                  <Label>Reflection</Label>
                  <p className="text-text-secondary text-sm italic">{mujahada.reflection}</p>
                </div>
              )}
            </Section>
          )}

          {/* ── Mu'ataba ── */}
          {muataba && (
            <Section icon={Heart} title="Mu'ataba" subtitle="Gentle review">
              {muataba.patterns.length > 0 && (
                <div className="space-y-1">
                  <Label>Patterns</Label>
                  {muataba.patterns.map((p, i) => (
                    <p key={i} className="text-text-secondary text-sm">• {p}</p>
                  ))}
                </div>
              )}
              {muataba.change_for_tomorrow && (
                <div>
                  <Label>Change for tomorrow</Label>
                  <p className="text-gold text-sm font-medium">{muataba.change_for_tomorrow}</p>
                </div>
              )}
              {muataba.gratitude && (
                <div>
                  <Label>Gratitude</Label>
                  <p className="text-text-secondary text-sm italic">{muataba.gratitude}</p>
                </div>
              )}
            </Section>
          )}
        </motion.div>
      </div>
    </main>
  )
}

// ── Small sub-components ────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <motion.div variants={fadeUp} className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <Icon size={15} className="text-gold" />
        <div>
          <h3 className="text-text-primary text-sm font-medium">{title}</h3>
          <p className="text-text-muted text-[10px] uppercase tracking-[0.15em]">{subtitle}</p>
        </div>
      </div>
      {children}
    </motion.div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-text-muted text-[11px] uppercase tracking-[0.15em] mb-1">
      {children}
    </p>
  )
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="glass-card p-3 text-center">
      <p className="text-lg font-light text-gold">{value}</p>
      <p className="text-text-muted text-xs">{label}</p>
    </div>
  )
}

function Chips({
  label,
  items,
  variant = 'gold',
}: {
  label: string
  items: string[]
  variant?: 'gold' | 'emerald'
}) {
  const cls =
    variant === 'emerald'
      ? 'border-emerald-light/25 bg-emerald/[0.04] text-emerald-light'
      : 'border-gold/25 bg-gold/[0.04] text-gold'
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={i}
            className={`px-2.5 py-1 rounded-lg text-xs border ${cls}`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
