'use client'

import { useEffect } from 'react'

/**
 * Root error boundary. Auto-reloads on ChunkLoadError so users on stale HTML
 * (typically: a tab held open across a deploy) get the new bundle without
 * having to manually hard-refresh.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Detect chunk-load failures from any Next-emitted bundle and force a fresh
  // load. window.location.reload() bypasses HTML cache.
  const isChunkError =
    error.name === 'ChunkLoadError' ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch dynamically imported module')

  useEffect(() => {
    if (isChunkError && typeof window !== 'undefined') {
      window.location.reload()
    }
  }, [isChunkError])

  if (isChunkError) {
    // Brief placeholder while reload happens.
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-text-muted text-sm">Loading the latest version…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 space-y-4">
      <p className="arabic text-gold/60 text-2xl">إنا لله وإنا إليه راجعون</p>
      <h2 className="text-text-primary text-lg font-light">Something went wrong</h2>
      <p className="text-text-muted text-sm text-center max-w-sm">
        {error.message || 'An unexpected error occurred. Try refreshing the page.'}
      </p>
      <button
        onClick={reset}
        className="btn-gold mt-2"
      >
        Try again
      </button>
    </div>
  )
}
