'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Check, ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, PrayerTimes } from '@/lib/types'

const CALCULATION_METHODS = [
  { id: 8,  name: 'Gulf Region',                      region: 'Bahrain / UAE / Oman' },
  { id: 4,  name: 'Umm Al-Qura, Makkah',             region: 'Saudi Arabia' },
  { id: 2,  name: 'Islamic Society of North America',  region: 'North America' },
  { id: 3,  name: 'Muslim World League',               region: 'Europe / Global' },
  { id: 5,  name: 'Egyptian General Authority',        region: 'Egypt / Africa' },
  { id: 1,  name: 'University of Islamic Sciences',    region: 'Pakistan / South Asia' },
  { id: 9,  name: 'Kuwait',                            region: 'Kuwait' },
  { id: 10, name: 'Qatar',                             region: 'Qatar' },
  { id: 16, name: 'Dubai',                             region: 'Dubai / UAE' },
  { id: 13, name: 'Diyanet İşleri Başkanlığı',         region: 'Turkey' },
  { id: 11, name: 'Majlis Ugama Islam Singapura',      region: 'Singapore' },
  { id: 21, name: 'Morocco',                           region: 'Morocco' },
  { id: 23, name: 'Ministry of Awqaf',                 region: 'Jordan' },
  { id: 0,  name: 'Shia Ithna-Ashari (Qum)',          region: 'Iran / Shia' },
  { id: 7,  name: 'University of Tehran',              region: 'Iran' },
]

const COMMON_AVOIDANCES = [
  'No Instagram', 'No Twitter/X', 'No LinkedIn', 'No YouTube',
  'No TikTok', 'No Slack', 'No email', 'No phone calls',
  'No news sites', 'No online shopping',
]

const COMMON_BOUNDARIES = [
  "Won't skip prayer", "Won't work past Isha",
  'Will eat a proper meal', 'Will take breaks every 90 min',
  'Will drink water', "Won't skip exercise",
]

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 180, damping: 22 },
  },
}

export function SettingsClient({ profile }: { profile: Profile }) {
  const supabase = useMemo(() => createClient(), [])
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [dirty, setDirty] = useState(false)

  // Presets
  const [avoidances, setAvoidances] = useState<string[]>(profile.presets?.avoidances || [])
  const [boundaries, setBoundaries] = useState<string[]>(profile.presets?.boundaries || [])
  const [buckets, setBuckets] = useState<string[]>(profile.presets?.buckets || [])
  const [customAvoidance, setCustomAvoidance] = useState('')
  const [customBoundary, setCustomBoundary] = useState('')
  const [customBucket, setCustomBucket] = useState('')
  const avoidInputRef = useRef<HTMLInputElement>(null)
  const boundaryInputRef = useRef<HTMLInputElement>(null)
  const bucketInputRef = useRef<HTMLInputElement>(null)

  const removeBucket = (item: string) => {
    setBuckets(prev => prev.filter(b => b !== item))
    markDirty()
  }

  // Prayer method
  const [prayerMethod, setPrayerMethod] = useState<number>(profile.prayer_method ?? 8)
  const [previewTimes, setPreviewTimes] = useState<PrayerTimes | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    const fetchPreview = async () => {
      setLoadingPreview(true)
      const lat = profile.location_lat || 26.2235
      const lng = profile.location_lng || 50.5876
      const res = await fetch(`/api/prayer-times?lat=${lat}&lng=${lng}&method=${prayerMethod}`)
      const data = await res.json()
      setPreviewTimes(data.timings)
      setLoadingPreview(false)
    }
    fetchPreview()
  }, [prayerMethod, profile.location_lat, profile.location_lng])

  const markDirty = () => { setDirty(true); setSaveState('idle') }

  const toggleAvoidance = (item: string) => {
    setAvoidances(prev => prev.includes(item) ? prev.filter(a => a !== item) : [...prev, item])
    markDirty()
  }

  const toggleBoundary = (item: string) => {
    setBoundaries(prev => prev.includes(item) ? prev.filter(b => b !== item) : [...prev, item])
    markDirty()
  }

  const addCustom = (
    value: string,
    setValue: (v: string) => void,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    inputRef: React.RefObject<HTMLInputElement | null>,
  ) => {
    const trimmed = value.trim()
    if (trimmed && !list.includes(trimmed)) {
      setList(prev => [...prev, trimmed])
      setValue('')
      markDirty()
    }
    inputRef.current?.focus()
  }

  const handleSave = async () => {
    setSaveState('saving')
    await supabase
      .from('profiles')
      .update({ prayer_method: prayerMethod, presets: { avoidances, boundaries, buckets } })
      .eq('id', profile.id)

    setSaveState('saved')
    setDirty(false)
    setTimeout(() => setSaveState('idle'), 2000)
  }

  return (
    <main className="flex-1 flex flex-col min-h-screen">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-20 flex items-center justify-between px-8 py-4 border-b border-border-subtle bg-bg-primary/80 backdrop-blur-xl"
      >
        <a
          href="/dashboard"
          className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors py-1 -ml-1"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Dashboard</span>
        </a>
        <p className="arabic text-gold/60 text-sm absolute left-1/2 -translate-x-1/2">إعدادات</p>
        <motion.button
          onClick={handleSave}
          disabled={!dirty && saveState !== 'saved'}
          className={`text-sm font-medium py-1.5 px-4 rounded-lg transition-all ${
            saveState === 'saved'
              ? 'text-emerald-light'
              : dirty
              ? 'text-gold hover:bg-gold/[0.06]'
              : 'text-text-muted'
          }`}
          whileTap={dirty ? { scale: 0.95 } : {}}
        >
          <AnimatePresence mode="wait">
            {saveState === 'saving' ? (
              <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" /> Saving
              </motion.span>
            ) : saveState === 'saved' ? (
              <motion.span key="saved" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="flex items-center gap-1.5">
                <Check size={14} /> Saved
              </motion.span>
            ) : (
              <motion.span key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {dirty ? 'Save' : 'Saved'}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.header>

      <div className="flex-1 px-6 py-8 max-w-xl mx-auto w-full relative z-10 pb-24">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
          className="space-y-12"
        >
          {/* ── Prayer Calculation Method ── */}
          <motion.section variants={fadeUp} className="space-y-5">
            <div>
              <h2 className="text-base font-medium text-text-primary">Prayer Calculation</h2>
              <p className="text-text-muted text-xs mt-1">
                Different schools calculate Fajr and Isha angles differently
              </p>
            </div>

            {/* Preview pinned at top of this section */}
            <AnimatePresence mode="wait">
              {previewTimes && (
                <motion.div
                  key={prayerMethod}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-card p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-text-muted text-xs">Today&apos;s times</p>
                    {loadingPreview && <Loader2 size={12} className="text-text-muted animate-spin" />}
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {Object.entries(previewTimes).map(([name, time]) => (
                      <div key={name} className="py-1">
                        <p className="text-gold text-sm font-medium tabular-nums">{time}</p>
                        <p className="text-text-muted text-[10px] mt-0.5">{name}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Method list — compact */}
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {CALCULATION_METHODS.map(method => (
                <motion.button
                  key={method.id}
                  onClick={() => { setPrayerMethod(method.id); markDirty() }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                    prayerMethod === method.id
                      ? 'border-gold/25 bg-gold/[0.04]'
                      : 'border-transparent hover:bg-bg-elevated/50'
                  }`}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-sm truncate ${prayerMethod === method.id ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {method.name}
                      </p>
                      <p className="text-text-muted text-[10px]">{method.region}</p>
                    </div>
                    {prayerMethod === method.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="flex-shrink-0"
                      >
                        <Check size={14} className="text-gold" />
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.section>

          <div className="h-px bg-border-subtle" />

          {/* ── Avoidance Presets ── */}
          <motion.section variants={fadeUp} className="space-y-4">
            <div>
              <h2 className="text-base font-medium text-text-primary">Default Avoidances</h2>
              <p className="text-text-muted text-xs mt-1">Auto-loaded into every new session</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {COMMON_AVOIDANCES.map(item => {
                const active = avoidances.includes(item)
                return (
                  <motion.button
                    key={item}
                    onClick={() => toggleAvoidance(item)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      active
                        ? 'border-gold/25 bg-gold/[0.05] text-gold'
                        : 'border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-accent'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    {item}
                  </motion.button>
                )
              })}
            </div>

            {/* Custom avoidances as removable chips */}
            <AnimatePresence>
              {avoidances.filter(a => !COMMON_AVOIDANCES.includes(a)).map(item => (
                <motion.span
                  key={item}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gold/25 bg-gold/[0.05] text-gold mr-2"
                >
                  {item}
                  <button
                    onClick={() => toggleAvoidance(item)}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>

            <div className="flex gap-2">
              <input
                ref={avoidInputRef}
                type="text"
                value={customAvoidance}
                onChange={e => setCustomAvoidance(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustom(customAvoidance, setCustomAvoidance, avoidances, setAvoidances, avoidInputRef)}
                placeholder="Add your own..."
                className="input-dark flex-1"
              />
              <motion.button
                onClick={() => addCustom(customAvoidance, setCustomAvoidance, avoidances, setAvoidances, avoidInputRef)}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-border-subtle text-text-muted hover:text-gold hover:border-gold/25 transition-all"
                whileTap={{ scale: 0.9 }}
              >
                <Plus size={16} />
              </motion.button>
            </div>
          </motion.section>

          <div className="h-px bg-border-subtle" />

          {/* ── Boundary Presets ── */}
          <motion.section variants={fadeUp} className="space-y-4">
            <div>
              <h2 className="text-base font-medium text-text-primary">Default Boundaries</h2>
              <p className="text-text-muted text-xs mt-1">Structural limits that protect your wellbeing</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {COMMON_BOUNDARIES.map(item => {
                const active = boundaries.includes(item)
                return (
                  <motion.button
                    key={item}
                    onClick={() => toggleBoundary(item)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      active
                        ? 'border-emerald-light/25 bg-emerald/[0.05] text-emerald-light'
                        : 'border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-accent'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    {item}
                  </motion.button>
                )
              })}
            </div>

            <AnimatePresence>
              {boundaries.filter(b => !COMMON_BOUNDARIES.includes(b)).map(item => (
                <motion.span
                  key={item}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-emerald-light/25 bg-emerald/[0.05] text-emerald-light mr-2"
                >
                  {item}
                  <button
                    onClick={() => toggleBoundary(item)}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>

            <div className="flex gap-2">
              <input
                ref={boundaryInputRef}
                type="text"
                value={customBoundary}
                onChange={e => setCustomBoundary(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustom(customBoundary, setCustomBoundary, boundaries, setBoundaries, boundaryInputRef)}
                placeholder="Add your own..."
                className="input-dark flex-1"
              />
              <motion.button
                onClick={() => addCustom(customBoundary, setCustomBoundary, boundaries, setBoundaries, boundaryInputRef)}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-border-subtle text-text-muted hover:text-emerald-light hover:border-emerald-light/25 transition-all"
                whileTap={{ scale: 0.9 }}
              >
                <Plus size={16} />
              </motion.button>
            </div>
          </motion.section>

          <div className="h-px bg-border-subtle" />

          {/* ── Buckets ── */}
          <motion.section variants={fadeUp} className="space-y-4">
            <div>
              <h2 className="text-base font-medium text-text-primary">Buckets</h2>
              <p className="text-text-muted text-xs mt-1">
                Life domains or projects you can assign tasks to — e.g. &ldquo;Work&rdquo;, &ldquo;Family&rdquo;, &ldquo;Deen&rdquo;, &ldquo;Thesis&rdquo;.
                Especially useful for full-day sessions.
              </p>
            </div>

            <AnimatePresence>
              {buckets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {buckets.map(item => (
                    <motion.span
                      key={item}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gold/25 bg-gold/[0.05] text-gold"
                    >
                      {item}
                      <button
                        onClick={() => removeBucket(item)}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </motion.span>
                  ))}
                </div>
              )}
            </AnimatePresence>

            <div className="flex gap-2">
              <input
                ref={bucketInputRef}
                type="text"
                value={customBucket}
                onChange={e => setCustomBucket(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustom(customBucket, setCustomBucket, buckets, setBuckets, bucketInputRef)}
                placeholder="Add a bucket..."
                className="input-dark flex-1"
              />
              <motion.button
                onClick={() => addCustom(customBucket, setCustomBucket, buckets, setBuckets, bucketInputRef)}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-border-subtle text-text-muted hover:text-gold hover:border-gold/25 transition-all"
                whileTap={{ scale: 0.9 }}
              >
                <Plus size={16} />
              </motion.button>
            </div>
          </motion.section>
        </motion.div>
      </div>

      {/* Sticky save bar — only shows when dirty */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-bg-primary/90 backdrop-blur-xl border-t border-border-subtle"
          >
            <div className="max-w-xl mx-auto">
              <motion.button
                onClick={handleSave}
                className="btn-gold w-full flex items-center justify-center gap-2"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={saveState === 'saving'}
              >
                {saveState === 'saving' ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : (
                  'Save Changes'
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
