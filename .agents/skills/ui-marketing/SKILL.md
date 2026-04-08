---
name: ui-marketing
description: Marketing and landing page design — hero sections, CTA hierarchy, social proof, scroll animations, conversion optimization.
---

# UI Marketing Skill

> Loaded when: Project is a marketing/landing site
> Sources: Landing page communication frameworks, conversion optimization principles

## Rules

**ALWAYS:**

- Hero section: large typography (`text-5xl md:text-7xl tracking-tighter leading-none`), clear CTA hierarchy, concise value proposition.
- Two CTAs per hero: primary (high-contrast, filled) and secondary (outline/ghost). Primary stands out, secondary is de-emphasized.
- Mobile-first responsive: stack on mobile (`flex-col`), expand on desktop (`md:flex-row`). Test at 375px, 768px, 1280px.
- Generous whitespace between sections: `py-16 md:py-24 lg:py-32`. Let content breathe.
- Social proof near hero: logos, testimonials, or metrics within first viewport.
- Staggered reveals on scroll: use Framer Motion `motion.div` with `initial={{ opacity: 0, y: 20 }}` and `whileInView={{ opacity: 1, y: 0 }}`.
- Above-the-fold content must communicate: what it does, who it's for, and the primary CTA — all without scrolling.
- Optimize for conversion: reduce friction, use risk reducers (free trial, no credit card, money-back guarantee).
- Use the ARCS copywriting formula: Ask (yes-question) → Reveal (show understanding) → Call (present solution) → Send (clear CTA).
- Every section has a purpose: hero (transformation), social proof (trust), features/use cases (value), pricing (decision), FAQ (objections), final CTA (action).
- Feature sections: group by outcome, not by feature name. Show transformation (before → after).
- Pricing: focus on value tiers, simple clear benefits, risk reducers. Highlight recommended tier.

**NEVER:**

- Never use centered hero with dark background image as default — try asymmetric layouts: text left, visual right.
- Never rely on "Learn More" as primary CTA — use action-oriented: "Start Free", "Get Started", "Try for Free".
- Never use more than 2 CTAs per section — causes decision paralysis.
- Never use lorem ipsum or placeholder content — write real, specific copy.
- Never use generic stock photography — use product screenshots, illustrations, or generated visuals.
- Never hide pricing — transparency builds trust.
- Never use jargon in hero copy — speak the customer's language.
- Never put critical information below 3 scrolls — most visitors don't scroll that far.
- Never use walls of text — break into scannable bullets, cards, or visual blocks.

**PREFER:**

- Prefer specific numbers over vague claims: "47.2% faster" not "blazing fast". "2,847 teams" not "thousands of teams".
- Prefer asymmetric hero layouts (text left, visual right) over centered text blocks.
- Prefer `section` tags with meaningful `id` attributes for scroll navigation.
- Prefer `<picture>` with WebP/AVIF sources and fallback for hero images.
- Prefer horizontal logo bars for social proof over individual logo cards.
- Prefer 3-step "How it Works" sections — keeps process digestible.

**AVOID:**

- Avoid auto-playing video with sound.
- Avoid carousel/slider for key content — most users never advance. Show all items.
- Avoid popups within first 10 seconds — let visitors engage first.
- Avoid tiny text for disclaimers/limitations — be transparent, style them clearly.

## Patterns

### Landing Page Structure

```
1. Hero: Headline + Subhead + 2 CTAs + Visual
2. Social Proof: Logo bar or metric strip
3. Problem/Pain: Empathize with current state
4. Solution/Features: 3-4 outcomes (not features)
5. How it Works: 3-step process
6. Testimonials: Real quotes with names/roles/photos
7. Pricing: 2-3 tiers, recommended highlighted
8. FAQ: Top 5-7 objections answered
9. Final CTA: Repeat hero CTA with urgency
10. Footer: Links, legal, social
```

### Hero Section

```tsx
<section className="py-20 md:py-32 px-6">
  <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
    <div>
      <h1 className="text-5xl md:text-7xl font-semibold tracking-tighter leading-none">
        Transform [X] into [desired outcome]
      </h1>
      <p className="mt-6 text-lg text-muted-foreground max-w-[50ch]">
        Get [specific result] in [timeframe]. No [common objection].
      </p>
      <div className="mt-8 flex gap-4">
        <Button size="lg">Start Free</Button>
        <Button size="lg" variant="outline">See Demo</Button>
      </div>
    </div>
    <div>{/* Product screenshot or illustration */}</div>
  </div>
</section>
```

### Scroll Animation Pattern

```tsx
<motion.div
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-100px" }}
  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
>
  {children}
</motion.div>
```

### Social Proof Strip

```tsx
<section className="py-12 border-y">
  <div className="max-w-7xl mx-auto px-6">
    <p className="text-sm text-muted-foreground text-center mb-8">
      Trusted by 2,847 teams worldwide
    </p>
    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60">
      {logos.map(logo => <img key={logo.name} src={logo.src} alt={logo.name} className="h-8" />)}
    </div>
  </div>
</section>
```

### Pricing Section

```tsx
// Highlight recommended tier with ring-2 ring-primary
// Include: what's included (bullets), price, CTA, popular badge
// Add risk reducer below: "14-day free trial. No credit card required."
```

### Communication for Different Audiences (PCM Model)

```
Thinkers  → Data and logic: "Convert raw input into structured output"
Harmonizers → Personal impact: "Finally caught up with your backlog"
Rebels    → Breaking free: "Done with manual busywork?"
Promoters → Quick wins: "One upload = endless opportunities"
Persisters → Quality outcomes: "Quality in, more value out"
Imaginers → Possibilities: "Unlock hidden potential"
```

## Anti-Patterns

- Centered hero text on dark stock photo — generic, forgettable. Use asymmetric layout with product visual.
- "Learn More" as primary CTA — zero urgency. Use "Start Free", "Get Started", "Try It Now".
- Feature-first copy: "We use AI and ML" — nobody cares. Lead with outcome: "Save 4 hours per week".
- Auto-playing carousel for testimonials — users miss most. Show 2-3 testimonials statically.
- Pricing page hidden behind "Contact Sales" for self-serve products — kills conversion.
- Walls of text explaining features — use visual cards, icons, before/after comparisons.
- Using vague metrics: "blazing fast", "thousands of users" — use specific numbers.
