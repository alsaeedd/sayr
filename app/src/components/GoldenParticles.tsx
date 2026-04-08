'use client'

import { useEffect, useRef } from 'react'

interface Props {
  count?: number
  speed?: number
  className?: string
}

export function GoldenParticles({ count = 24, speed = 1, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const particles: {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      opacity: number
      fadeSpeed: number
    }[] = []

    for (let i = 0; i < count; i++) {
      particles.push({
        x: rect.width / 2 + (Math.random() - 0.5) * 60,
        y: rect.height / 2 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 0.8 * speed,
        vy: -Math.random() * 1.2 * speed - 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.6 + 0.2,
        fadeSpeed: Math.random() * 0.004 + 0.002,
      })
    }

    let animationId: number

    const animate = () => {
      ctx.clearRect(0, 0, rect.width, rect.height)

      let alive = false
      for (const p of particles) {
        if (p.opacity <= 0) continue
        alive = true

        p.x += p.vx
        p.y += p.vy
        p.vy -= 0.003 // gentle float upward
        p.opacity -= p.fadeSpeed

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(212, 175, 55, ${Math.max(0, p.opacity)})`
        ctx.fill()

        // Glow
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(212, 175, 55, ${Math.max(0, p.opacity * 0.15)})`
        ctx.fill()
      }

      if (alive) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animationId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationId)
  }, [count, speed])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
