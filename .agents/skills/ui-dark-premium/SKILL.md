---
name: ui-dark-premium
description: Dark premium aesthetic — Bento 2.0, Taste Skill system, spring physics, anti-AI-slop patterns. Load for dark/premium visual style.
---

# UI Dark Premium Skill

> Loaded when: Project uses dark/premium aesthetic
> Sources: Leonxlnx/taste-skill SKILL.md (Bento 2.0 paradigm)

## Rules

**ALWAYS:**

- Background: `#f9fafb` (warm gray) for light mode. Pure `#0e1011` or Zinc-950 for dark mode. Never pure `#000000`.
- Card surfaces: pure white `#ffffff` (light) or near-black (dark) with 1px `border-slate-200/50`.
- Shadows: diffusion style — `shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]`. Tint shadows to background hue, never pure black shadows.
- Containers: `rounded-[2.5rem]` for major surfaces. Interior padding `p-8` or `p-10`.
- Typography: Geist, Satoshi, or Cabinet Grotesk with `tracking-tight` for headers. Never Inter.
- Max 1 accent color per project. Saturation < 80% (desaturated blends).
- Use absolute neutral bases (Zinc/Slate) with singular, high-contrast accents (Emerald, Electric Blue, Deep Rose).
- Depth through material (borders, subtle shadows, `backdrop-blur` with 1px inner border `border-white/10`), not brightness.
- Labels positioned OUTSIDE and BELOW cards — gallery-style presentation.
- Implement full interaction cycles: skeletal loading states, composed empty states, inline error reporting, tactile feedback (`:active` → `-translate-y-[1px]` or `scale-[0.98]`).
- Spring physics on all interactive elements: `type: "spring", stiffness: 100, damping: 20`. No linear easing.
- Animate ONLY `transform` and `opacity`. Never `top`, `left`, `width`, `height`.
- Perpetual micro-animations (pulse, typewriter, float, shimmer) must be memoized and isolated in their own Client Components.
- Use `will-change: transform` sparingly. Use `useMotionValue` / `useTransform` for continuous animations — never `useState`.

**NEVER:**

- Never use pure `#000000` — use Off-Black, Zinc-950, or Charcoal.
- Never use neon/outer glows or default `box-shadow` glows — use inner borders or subtle tinted shadows.
- Never use the "AI Purple/Blue" aesthetic (THE LILA BAN) — no purple button halos, no neon gradients.
- Never use oversaturated accents — desaturate to blend elegantly with neutrals.
- Never use excessive gradient text on large headers.
- Never use custom mouse cursors.
- Never use emojis in code, markup, or text content — use high-quality icons (Phosphor, Radix).
- Never use generic 3-column icon grids — banned. Use 2-col zig-zag, asymmetric grids, or horizontal scroll.
- Never use generic names ("John Doe"), generic avatars (SVG egg icons), or startup slop names ("Acme", "Nexus").
- Never use filler clichés ("Elevate", "Seamless", "Unleash", "Next-Gen").
- Never use broken Unsplash links — use `https://picsum.photos/seed/{random}/800/600` or SVG UI Avatars.
- Never leave shadcn/ui in default state — customize radii, colors, shadows to match aesthetic.
- Never apply grain/noise filters to scrolling containers — causes continuous GPU repaints. Use fixed `pointer-events-none` pseudo-elements only.
- Never spam arbitrary `z-50` or `z-10` — reserve for systemic layers (navbar, modals, overlays).

**PREFER:**

- Prefer CSS Grid over flexbox percentage math.
- Prefer `min-h-[100dvh]` over `h-screen` (iOS Safari compatibility).
- Prefer asymmetric layouts: split screen (50/50), left-aligned content / right-aligned asset.
- Prefer Framer Motion `layout` and `layoutId` for smooth re-ordering transitions.
- Prefer `staggerChildren` for sequential waterfall reveals. Parent variants and children MUST be in the same Client Component tree.

## Patterns

### 6-Category Design Diagnostic

When reviewing UI, evaluate each category:

1. **Layout** — Asymmetry, hierarchy, grid usage, containment
2. **Typography** — Font choice, weight/color hierarchy (not just size), line height, max-width
3. **Color** — Single accent, neutral bases, no pure black, no neon
4. **Spacing** — 8pt grid, generous padding (p-8/p-10), intentional whitespace
5. **Motion** — Spring physics, transform/opacity only, memoized perpetual animations
6. **Accessibility** — Contrast ratios, focus rings, loading/empty/error states

### Glassmorphism Panel

```css
backdrop-blur-xl
bg-white/5
border border-white/10
shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]
rounded-[2.5rem]
```

### Tactile Button Feedback

```tsx
<button className="active:-translate-y-[1px] active:scale-[0.98] transition-transform">
  {children}
</button>
```

### Magnetic Button (Framer Motion)

```tsx
// Use useMotionValue + useTransform — NEVER useState for continuous animations
const x = useMotionValue(0);
const y = useMotionValue(0);
// Track mouse relative to button center, apply dampened transform
```

## Anti-Patterns

- Pure black backgrounds — use `#0e1011` or Zinc-950.
- Neon glow buttons — use subtle tinted shadows or inner borders.
- Purple/blue "AI aesthetic" — use Emerald, Electric Blue, or Deep Rose instead.
- Generic 3-column feature grid — use asymmetric layouts.
- Using `useState` for magnetic hover or continuous animations — causes render thrashing. Use `useMotionValue`.
- Default shadcn/ui without customization — adjust radii, colors, shadows.
- Spinners for loading — use skeletal loaders matching layout dimensions.
