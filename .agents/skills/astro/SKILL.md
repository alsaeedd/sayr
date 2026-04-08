---
name: astro
description: Astro island architecture — client directives, Content Layer API, server islands, output modes, image optimization. Load for *.astro, astro.config.*.
---

# Astro Skill

> Loaded when: Working on `*.astro`, `astro.config.*`
> Sources: delineas/astro-framework-agents SKILL.md, Astro official AI guidance

## Rules

**ALWAYS:**

- Static-first: zero JavaScript by default. Only hydrate what NEEDS interactivity.
- Choose the right client directive in order of preference:
  1. No directive → Static HTML, zero JS (~90% of most sites)
  2. `server:defer` → Deferred server rendering (personalized content)
  3. `client:load` → Hydrate immediately (interactive above-fold)
  4. `client:idle` → Hydrate when browser idle (non-critical interactive)
  5. `client:visible` → Hydrate when enters viewport (below-fold interactive)
  6. `client:media` → Hydrate when media query matches
  7. `client:only="react"` → Skip SSR, client-only — always specify framework string
- Use Content Layer API with loaders in `src/content.config.ts` (Astro 5+):
  - `glob()` for local markdown/MDX
  - `file()` for single JSON/YAML files
  - Custom async loader for remote API/CMS at build time
- Define content collection schemas with Zod. Import Zod from `astro/zod` (not `zod`). Use `z.coerce.date()` for frontmatter dates — never plain `z.date()`.
- Import rendering: `import { render } from "astro:content"` then `await render(entry)` (Astro 5+ replaced `entry.render()`).
- Use `<Image />` and `<Picture />` from `astro:assets` for ALL images — never bare `<img>` with string paths. Import local images.
- Scoped styles by default. Global styles only in layouts.
- TypeScript strict mode with `strict` or `strictest` template.
- Use `Astro.props` for component data. Define `interface Props` in frontmatter.
- Use `astro:env` schema for type-safe environment variables.
- Always provide `slot="fallback"` on `server:defer` components.
- Always define `getStaticPaths()` for `[param]` routes in static output.

**NEVER:**

- Never access `window` / `document` in `.astro` frontmatter — it runs on the server.
- Never use `client:load` on everything — defeats the purpose of islands architecture.
- Never use `client:only` without specifying the framework: `client:only="react"`.
- Never use `Astro.glob()` — deprecated. Use content collections with Content Layer API.
- Never use string paths for local images: `src="/images/hero.jpg"` — import them instead.
- Never access `Astro.request` / `Astro.cookies` / `Astro.session` in prerendered pages.
- Never rely on `Astro.url` inside server islands — returns internal route. Use `Referer` header.
- Never pass large objects as server island props (IDs only; > 2048 bytes forces POST).
- Never add `"use client"` — that's Next.js, not Astro.
- Never generate Next.js-style API routes in Astro projects.

**PREFER:**

- Prefer `hybrid` output mode for most real-world projects (80% static + login/dashboard/API).
- Prefer vanilla JS `<script>` for simple interactions (mobile menu toggle) over hydrating React.
- Prefer `<details>` / `<summary>` for accordions over React components — zero JS.
- Prefer static HTML for navigation, footers, content — only hydrate truly interactive parts.

**AVOID:**

- Avoid `client:visible` on hero/header — already in viewport at load, hydrates immediately anyway. Use `client:load` directly.
- Avoid `client:idle` on mobile for critical interactions — `requestIdleCallback` on low-RAM devices can take 10+ seconds.
- Avoid hydrating entire components when only one button needs interactivity — split static shell from interactive part.

## Patterns

### Output Mode Decision

```
Blog, docs, landing pages, < 500 pages → static (default)
Mostly static + login/dashboard/API    → hybrid (80% real-world)
> 80% pages need request data, full SaaS → server (rarely needed)
```

### Content Collection (Astro 5+)

```typescript
// src/content.config.ts
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),  // NOT z.date()
    draft: z.boolean().default(false),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = { blog };
```

### Server Island Pattern

```astro
---
import UserAvatar from "../components/UserAvatar.astro";
---
<UserAvatar server:defer>
  <img slot="fallback" src="/generic-avatar.svg" alt="Loading..." />
</UserAvatar>
```

### Island Decision Tree

```
Needs server data per request? (cookies, DB, personalization)
├── Yes → server:defer
└── No → Needs browser interactivity?
    ├── Yes → client:* directive (search, forms, carousels)
    └── No → Static HTML, zero JS
```

## Anti-Patterns

- Using `client:load` on every component — ships unnecessary JavaScript, defeats islands architecture.
- Using React for accordion/tabs that could be `<details>` / CSS — unnecessary JS payload.
- Importing Zod from `zod` instead of `astro/zod` — breaks Astro 5+ integration.
- Using `Astro.glob()` for content — deprecated. Use content collections.
- Putting `client:visible` on above-fold hero section — it's already visible, use `client:load` instead.
- Using `entry.render()` in Astro 5+ — replaced by `import { render } from "astro:content"`.
