---
name: react
description: React 19+ best practices — hooks, composition, waterfall elimination, bundle optimization, state management. Load for *.tsx, *.jsx.
---

# React 19+ Skill

> Loaded when: Working on `*.tsx`, `*.jsx`, React components
> Sources: Vercel agent-skills react-best-practices (64 rules), shadcn/ui component patterns

## Rules

**ALWAYS:**

- Use React 19 primitives: `useActionState` (replaces `useFormState`), `useOptimistic`, `use()` (replaces `useContext()`), `useFormStatus`. `ref` is a regular prop — no more `forwardRef`. Context is its own provider — no more `.Provider`.
- Calculate derived state during rendering — never in `useEffect`. If `fullName = firstName + " " + lastName`, just compute it inline.
- Put interaction logic in event handlers, not `useEffect` + state. Don't model user actions as state-then-effect.
- Use functional `setState` updates: `setState(curr => [...curr, newItem])` — prevents stale closures and stabilizes callbacks.
- Use lazy state initialization for expensive computations: `useState(() => computeExpensive())`.
- Use `startTransition` for non-urgent updates (search, scroll tracking). Use `useTransition` over manual `isPending` state.
- Use `useDeferredValue` for expensive derived renders — keeps input responsive while computation defers.
- Use `useRef` for transient values (mouse position, timers) that don't need re-renders.
- Use `toSorted()`, `toReversed()`, `toSpliced()` for immutable array operations — never mutate state/props with `.sort()`.
- Extend HTML elements with `ComponentPropsWithoutRef<"div">`. Use discriminated unions for variant props. Use `satisfies` for config objects.
- Use passive event listeners for scroll/touch: `{ passive: true }`.
- Eliminate waterfalls: check cheap sync conditions before async calls, defer `await` into branches, use `Promise.all()` for independent operations.

**NEVER:**

- Never use class components.
- Never use `useEffect` for derived state, event handler logic, or data fetching in components that should be server components.
- Never use `useCallback`/`useMemo` everywhere "just in case" — with React Compiler active, manual memoization is largely unnecessary.
- Never use array index as `key` when items can reorder or be inserted/removed.
- Never mix controlled and uncontrolled patterns in the same input.
- Never define components inside other components — creates new component type every render, remounts child, destroys state.
- Never wrap simple expressions (boolean, number, string) in `useMemo` — hook overhead exceeds computation cost.
- Never use `useEffect` as a lifecycle method — use it only for synchronizing with external systems, subscriptions, DOM measurements.
- Never use barrel file imports — import directly from source files.

**PREFER:**

- Prefer compound components and composition over prop drilling or boolean prop proliferation.
- Prefer `asChild` pattern (Radix-style) for polymorphic components over render props.
- Prefer explicit conditional rendering with ternary (`? :`) over `&&` — avoids rendering falsy values like `0`.
- Prefer extracting expensive subtrees into `memo()` components for early-return optimization.
- Prefer `flatMap` over `.map().filter(Boolean)` — single pass, no intermediate array.
- Prefer `Set`/`Map` for O(1) lookups over `.includes()` / `.find()` on arrays.

**AVOID:**

- Avoid subscribing to entire objects when you only need a primitive: subscribe to `user.id` not `user`.
- Avoid `window.addEventListener('scroll')` for scroll-triggered animations — use Intersection Observer or Framer Motion hooks.
- Avoid creating new RegExp inside render — hoist to module level or memoize.
- Avoid interleaving DOM reads and writes (layout thrashing) — batch writes then read.

## Patterns

### State Management Hierarchy

```
React state (useState/useReducer) → simplest, component-local
URL state (nuqs)                  → shareable, bookmarkable
Server state (TanStack Query/SWR) → remote data with caching
Global client state (Zustand)     → cross-component, rare
```
Use the MINIMUM state management needed.

### Compound Component Pattern

```tsx
const Composer = {
  Frame: ComposerFrame,
  Input: ComposerInput,
  Submit: ComposerSubmit,
}

// Usage — explicit composition, no boolean prop explosion
<Composer.Frame>
  <Composer.Input />
  <AlsoSendToChannelField channelId={channelId} />
  <Composer.Submit />
</Composer.Frame>
```

### Waterfall Elimination

```typescript
// Bad: sequential — total time = sum of all fetches
const user = await fetchUser(id)
const posts = await fetchPosts(id)
const comments = await fetchComments(id)

// Good: parallel — total time = max of all fetches
const [user, posts, comments] = await Promise.all([
  fetchUser(id), fetchPosts(id), fetchComments(id)
])

// Good: chain nested deps per item
const results = await Promise.all(
  ids.map(id => getChat(id).then(chat => getUser(chat.authorId)))
)
```

### Performance Micro-Patterns

```tsx
// Extract defaults to module level for memo stability
const NOOP = () => {}
const UserAvatar = memo(function UserAvatar({ onClick = NOOP }: Props) { ... })

// Hoist static JSX
const skeleton = <div className="animate-pulse h-20" />
function Container({ loading }: Props) { return loading ? skeleton : <Content /> }

// content-visibility for long lists
// .message-item { content-visibility: auto; contain-intrinsic-size: 0 80px; }
```

## Anti-Patterns

- `useEffect` to sync `firstName + lastName` into `fullName` state — just compute it inline during render.
- `useState(JSON.parse(localStorage.getItem("key")))` without lazy init — runs every render. Use `useState(() => ...)`.
- Defining `const Avatar = () => <img />` inside a parent component — remounts every render, loses state.
- `users.sort((a, b) => ...)` in useMemo — `.sort()` mutates. Use `.toSorted()`.
- `{count && <Badge />}` when count can be `0` — renders `0`. Use `{count > 0 ? <Badge /> : null}`.
- Subscribing to `useSearchParams()` just to read one param in a click handler — read `window.location.search` on demand.
- Using `useMemo(() => a || b, [a, b])` for simple boolean — hook overhead exceeds inline computation.
