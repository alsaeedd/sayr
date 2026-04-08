---
name: nextjs
description: Next.js App Router — Server Components, Server Actions, caching, file conventions, Clerk auth, parallel fetching. Load for app/**, next.config.*.
---

# Next.js App Router Skill

> Loaded when: Working on `app/**`, `next.config.*`, `middleware.ts`
> Sources: Next.js AGENTS.md pattern, Cursor Forum battle-tested rules, Makerkit architecture

## Rules

**ALWAYS:**

- Server Components by default. Only add `"use client"` when you need: hooks (`useState`, `useEffect`), browser APIs, event handlers (`onClick`, `onChange`), or React Context consumers.
- Await async APIs: `cookies()`, `headers()`, `params`, `searchParams` are all Promises in Next.js 15+ — MUST be awaited.
- Create `error.tsx` alongside every `page.tsx`. It must be a client component with `error` and `reset` props.
- Create `loading.tsx` alongside every async `page.tsx` with skeleton UI (not spinners).
- Place `not-found.tsx` at every layout level where `notFound()` may be thrown.
- Validate Server Action input with Zod. Check auth. Call `revalidatePath()` or `revalidateTag()` after mutations.
- Use `Promise.all()` or separate `<Suspense>` boundaries for parallel data fetching — never sequential `await` chains.
- Keep `"use client"` wrappers small. Extract interactive parts into small client components; keep the page as a server component.
- Use `after()` from `next/server` for non-blocking operations (logging, analytics) — schedule after response.
- Authenticate Server Actions like public API endpoints — they are publicly invocable.
- Use `React.cache()` for per-request deduplication of expensive queries in server components.

**NEVER:**

- Never use `getServerSideProps` / `getStaticProps` — those are Pages Router.
- Never use `next/router` — use `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`).
- Never use `useFormState` — use `useActionState` (React 19).
- Never import `ImageResponse` from `next/server` — moved to `next/og`.
- Never create API Route Handlers just to fetch data that a server component could fetch directly.
- Never use `fetch` without explicit cache config in Next.js 15+ — fetch is UNCACHED by default. Set `cache: "force-cache"` when caching is needed.
- Never make entire pages client components — extract only the interactive parts.
- Never use module-level mutable state for request data in RSC/SSR — module scope is process-wide shared memory.

**PREFER:**

- Prefer Server Components for data fetching → Server Actions for mutations → Route Handlers only for external API consumers.
- Prefer `next/dynamic` with `ssr: false` for heavy client-only components (charts, editors).
- Prefer loading static assets (fonts, logos, config) at module level — runs once, reused across requests.
- Prefer `startTransition` for non-urgent state updates. Use `useTransition` over manual `isPending` state.
- Prefer passing only needed fields to client components — minimize serialization at RSC boundaries.

**AVOID:**

- Avoid barrel file imports (`@/components/index.ts`) — they load thousands of unused modules.
- Avoid sequential `await` chains that create waterfalls — restructure with separate async server components.
- Avoid inline objects as `React.cache()` arguments — use shallow equality (same reference) for cache hits.
- Avoid duplicate serialization in RSC props — do transformations on client instead.

## Patterns

### Data Fetching Decision Tree

```
Can fetch in Server Component directly? → Do that.
Need mutation?                          → Server Action with "use server"
Need client-side real-time/polling?     → TanStack Query / SWR
Need external API consumers?            → Route Handler
```

### Server Action Pattern

```typescript
"use server"

import { z } from "zod"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

const schema = z.object({ title: z.string().min(1).max(200) })

export async function createPost(formData: FormData) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const parsed = schema.safeParse({ title: formData.get("title") })
  if (!parsed.success) return { error: parsed.error.flatten() }

  await db.post.create({ data: { ...parsed.data, userId } })
  revalidatePath("/posts")
}
```

### Parallel Fetching with Composition

```tsx
// Good: separate async components parallelize automatically
async function Header() { const data = await fetchHeader(); return <Nav data={data} /> }
async function Sidebar() { const items = await fetchSidebarItems(); return <Menu items={items} /> }

export default function Page() {
  return (<div><Header /><Sidebar /></div>)  // Fetches run in parallel
}
```

### Clerk Auth Patterns

```typescript
// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server"
export default clerkMiddleware()

// Server Component
import { auth } from "@clerk/nextjs/server"
const { userId } = await auth()

// Client Component
import { useAuth } from "@clerk/nextjs"
const { userId } = useAuth()
```

### File Conventions Checklist

```
app/
├── layout.tsx          # Root layout (required)
├── page.tsx            # Home page
├── error.tsx           # Error boundary (client component)
├── loading.tsx         # Skeleton loading UI
├── not-found.tsx       # 404 page
├── [feature]/
│   ├── page.tsx
│   ├── error.tsx       # ← Required alongside page.tsx
│   ├── loading.tsx     # ← Required for async pages
│   └── not-found.tsx
```

## Anti-Patterns

- Creating `/api/getData` route then calling it from a server component — fetch directly in the server component.
- Putting `"use client"` at the top of a page component — extract interactive parts into leaf client components.
- Using `useEffect` to fetch data in components that should be server components.
- Sequential `await` chains in a single server component — use `Promise.all()` or component composition.
- Forgetting to await `cookies()` / `headers()` / `params` / `searchParams` in Next.js 15+ — they're Promises now.
- Using `process.env.NEXT_PUBLIC_*` in server code — use `process.env.*` directly (no prefix needed server-side).
