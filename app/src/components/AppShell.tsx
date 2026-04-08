'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const FloatingCandles = dynamic(
  () => import('@/components/FloatingCandles').then(mod => ({ default: mod.FloatingCandles })),
  { ssr: false }
)

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Persistent candles — single Canvas across all app pages */}
      <Suspense fallback={null}>
        <FloatingCandles className="opacity-50" />
      </Suspense>

      {/* Page content above candles */}
      <div className="relative z-10 flex flex-col flex-1">
        {children}
      </div>
    </div>
  )
}
