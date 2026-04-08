'use client'

import { motion } from 'framer-motion'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-primary">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-gold/[0.03] blur-[100px]" />

      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Arabic logo breathing */}
        <motion.p
          className="arabic text-gold text-3xl"
          animate={{
            opacity: [0.4, 0.8, 0.4],
            scale: [1, 1.03, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ textShadow: '0 0 24px rgba(212, 175, 55, 0.2)' }}
        >
          سَيْر
        </motion.p>

        {/* Minimal loading bar */}
        <div className="w-24 h-[2px] bg-border-subtle rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gold/50 rounded-full"
            animate={{ x: ['-100%', '100%'] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: [0.25, 1, 0.5, 1],
            }}
          />
        </div>
      </div>
    </div>
  )
}
