---
name: ui-design
description: Universal UI design rules — 8pt grid, shadcn/ui patterns, OKLCH colors, typography, WCAG accessibility. Load for components, styling, CSS, UI work.
---

# UI Design Skill

> Loaded when: Working on components, styling, CSS, or UI work
> Sources: fire-your-design-team.md, shadcn/ui SKILL.md, Radix Themes spacing

## Rules

**ALWAYS:**

- Use the 8pt grid system: all spacing divisible by 8 or 4. Tailwind mapping: `p-2` (8px), `p-4` (16px), `p-6` (24px), `p-8` (32px), `gap-2` (8px), `gap-4` (16px), `gap-8` (32px).
- Limit to 4 font sizes per page maximum. 2 font weights only: Semibold (600) for headings/emphasis, Regular (400) for body.
- Follow the 60/30/10 color rule: 60% neutral (`bg-background`), 30% complementary (`text-foreground`), 10% accent (brand color, CTAs only).
- Use `cn()` from `tailwind-merge` for all class merging. Define CVA variants outside components.
- Use semantic color tokens: `bg-primary`, `text-muted-foreground`, `border-input`. Never raw hex or Tailwind color scales like `bg-blue-500`.
- Use OKLCH color format for CSS variables: `--primary: oklch(0.205 0 0)`.
- Use `gap-*` with flex/grid for spacing. Never `space-x-*` or `space-y-*`.
- Use `size-*` when width equals height: `size-10` not `w-10 h-10`.
- Use `truncate` shorthand, not `overflow-hidden text-ellipsis whitespace-nowrap`.
- Meet WCAG AA 4.5:1 contrast minimum. Touch targets: 44x44pt minimum. Focus rings: 2-4px.
- Use `min-h-[100dvh]` for full-height sections. Never `h-screen` (breaks iOS Safari).
- Use CSS Grid (`grid grid-cols-1 md:grid-cols-3 gap-6`) over complex flexbox math (`w-[calc(33%-1rem)]`).
- Contain layouts: `max-w-[1400px] mx-auto` or `max-w-7xl`.

**NEVER:**

- Never use raw hex colors — use semantic tokens from CSS variables.
- Never manually concatenate classes — use `cn()`.
- Never use more than 4 font sizes on a single page.
- Never use spacing values not on the 8/4 grid (no 7px, 11px, 13px, 15px, 25px).
- Never add `z-*` to Dialog, Sheet, Drawer, or Popover — components handle stacking internally.
- Never override component colors/typography via `className` — use built-in variants first.
- Never manually add `dark:` color overrides — use semantic tokens that auto-switch.
- Never use Inter, Roboto, Arial, or system fonts for premium UIs — use Geist, Outfit, Cabinet Grotesk, or Satoshi.

**PREFER:**

- Prefer built-in variants (`variant="outline"`, `size="sm"`) before custom styles.
- Prefer semantic tokens → CSS variables → component CVA edits (in that order for customization).
- Prefer `interface` + `data-slot` for component part styling.
- Prefer weight extremes (100/200 vs 800/900) for typographic contrast. Size jumps of 3x+.

**AVOID:**

- Avoid barrel file imports for components — import directly.
- Avoid custom `animate-pulse` divs — use `Skeleton` component.
- Avoid `<hr>` or `border-t` divs — use `Separator` component.
- Avoid custom styled spans for tags — use `Badge` component.
- Avoid generic circular spinners for loading — use skeletal loaders matching layout sizes.

## Patterns

### Typography Scale

```
Display/Headlines: text-4xl md:text-6xl tracking-tighter leading-none font-semibold
Subheadings:       text-xl md:text-2xl tracking-tight font-semibold
Body:              text-base text-muted-foreground leading-relaxed max-w-[65ch]
Small/Labels:      text-sm text-muted-foreground
```

Avoid Inter for premium UIs. Use: Geist, Outfit, Cabinet Grotesk, or Satoshi. Pair with Geist Mono or JetBrains Mono for code/numbers.

### Responsive Spacing Scale

```
Section padding:  py-12 px-6 (mobile) → py-20 px-8 (desktop)
Card padding:     p-6
Card children:    space-y-4 or gap-4
Between cards:    gap-6
Between sections: gap-16 md:gap-24
Container:        max-w-7xl mx-auto px-6
```

### Tailwind v4 Specifics

- Use `@import "tailwindcss"` instead of `@tailwind base`.
- Replace `@layer base` with `@theme` directive for color registration.
- OKLCH color format: `--primary: oklch(0.205 0 0)` (lightness 0-1, chroma, hue 0-360).
- Register custom colors: `@theme inline { --color-warning: var(--warning); }`.
- Custom dark mode variant: `@custom-variant dark (&:is(.dark *))`.

### Form Validation States

- Place `data-invalid` on `Field`, `aria-invalid` on the control.
- For disabled: `data-disabled` on `Field`, `disabled` on control.
- Label above input. Helper text optional. Error text below input. Standard `gap-2` spacing.

### Shadcn Component Selection

```
Button/action     → Button with variant
Form structure    → FieldGroup + Field (not raw div + space-y-*)
Input groups      → InputGroup + InputGroupInput
Option sets (2-7) → ToggleGroup (not Button loop with manual active state)
Checkbox groups   → FieldSet + FieldLegend
Callouts          → Alert (not styled divs)
Empty states      → Empty component
Toast             → sonner via toast()
Loading           → Skeleton
Labels/tags       → Badge
Dividers          → Separator
Overlays          → Dialog (modal), Sheet (side), Drawer (bottom)
```

### Icon Rules

- Apply `data-icon="inline-start"` or `data-icon="inline-end"` on icons inside Button.
- Never add sizing classes (`size-4`, `w-4 h-4`) to icons inside component trees — components handle sizing via CSS.
- Pass icons as objects: `icon={CheckIcon}`, never string lookups.

### Card Composition

Always use full structure: `CardHeader` → `CardTitle` → `CardDescription` → `CardContent` → `CardFooter`. Never dump everything into `CardContent`.

### Accessibility in Overlays

Dialog, Sheet, and Drawer require Title components (`DialogTitle`, `SheetTitle`, `DrawerTitle`). Use `className="sr-only"` if visually hidden.

### Color Variables Convention

Every color follows `name` / `name-foreground` pattern. Base for backgrounds, `-foreground` for text/icons:
`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`.

## Anti-Patterns

- Using `space-x-4` instead of `gap-4` — causes issues with conditional children.
- Manually setting `z-50` on overlays — breaks stacking context.
- Using `w-10 h-10` instead of `size-10` — unnecessary duplication.
- Adding `isPending`/`isLoading` props to Button — compose with `Spinner` + `data-icon` + `disabled`.
- Rendering `TabsTrigger` directly in `Tabs` without `TabsList` wrapper.
- Missing `AvatarFallback` in Avatar — images fail silently.
- Using `bg-blue-500` instead of `bg-primary` — breaks theming.
- Overriding component colors via `className` instead of using variants or CSS variables.
