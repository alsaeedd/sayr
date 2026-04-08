'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { LoginButton } from '@/components/LoginButton'

const FloatingCandles = dynamic(
  () => import('@/components/FloatingCandles').then(mod => ({ default: mod.FloatingCandles })),
  { ssr: false }
)

const STEPS = [
  { ar: 'المشارطة', en: 'Musharata', desc: 'Set conditions' },
  { ar: 'المراقبة', en: 'Muraqaba', desc: 'Watch & work' },
  { ar: 'المحاسبة', en: 'Muhasaba', desc: 'Self-account' },
  { ar: 'المعاقبة', en: "Mu'aqaba", desc: 'Course correct' },
  { ar: 'المجاهدة', en: 'Mujahada', desc: 'Strive' },
  { ar: 'المعاتبة', en: "Mu'ataba", desc: 'Gentle review' },
]

const reveal = (delay: number) => ({
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 150,
      damping: 22,
      delay,
    },
  },
})

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center relative px-6 overflow-hidden">
      {/* Floating candles — Hogwarts Great Hall */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0"
      >
        <Suspense fallback={null}>
          <FloatingCandles />
        </Suspense>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center max-w-md text-center"
      >
        {/* Title block */}
        <motion.div variants={reveal(0)} className="mb-6">
          <motion.p
            initial={{ opacity: 0, scale: 0.92, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="arabic text-gold text-5xl leading-tight"
            style={{ textShadow: '0 0 32px rgba(212, 175, 55, 0.25)' }}
          >
            سَيْر
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl font-extralight tracking-[-0.03em] text-text-primary mt-1"
          >
            Sayr
          </motion.h1>
        </motion.div>

        {/* Bismillah */}
        <motion.div variants={reveal(0.5)} className="ornament-divider text-sm w-full mb-6">
          بسم الله الرحمن الرحيم
        </motion.div>

        {/* Description */}
        <motion.p
          variants={reveal(0.65)}
          className="text-text-secondary text-base leading-relaxed max-w-sm mb-8"
        >
          Walk your day with purpose. A structured work session guided by
          Imam Al-Ghazali&apos;s six-step framework for mastering your time and your nafs.
        </motion.p>

        {/* Steps grid */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06, delayChildren: 0.9 } },
          }}
          className="grid grid-cols-3 gap-3 w-full max-w-sm mb-10"
        >
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, y: 12, scale: 0.96 },
                show: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { type: 'spring' as const, stiffness: 220, damping: 22 },
                },
              }}
              whileHover={{
                scale: 1.04,
                borderColor: 'rgba(212, 175, 55, 0.15)',
                transition: { duration: 0.2 },
              }}
              className="glass-card py-3 px-2 text-center cursor-default"
            >
              <p className="arabic text-gold text-xs leading-tight">{step.ar}</p>
              <p className="text-text-primary font-medium text-xs mt-0.5">{step.en}</p>
              <p className="text-text-muted text-[10px] mt-0.5">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Login */}
        <motion.div variants={reveal(1.4)} className="mb-6">
          <LoginButton />
        </motion.div>

        {/* Tagline */}
        <motion.p variants={reveal(1.6)} className="text-text-muted text-xs tracking-wide">
          Begin with Bismillah. End with Shukr.
        </motion.p>
      </motion.div>
    </main>
  )
}
