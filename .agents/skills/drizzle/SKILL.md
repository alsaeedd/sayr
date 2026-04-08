---
name: drizzle
description: Drizzle ORM patterns — schema conventions, identity columns, drizzle-kit safety, prepared statements, cursor pagination. Load for drizzle.config.*, db/schema/**.
---

# Drizzle ORM Skill

> Loaded when: Working on `drizzle.config.*`, `schema.ts` with pgTable, `db/schema/**`
> Sources: Drizzle official best practices, productdevbook Drizzle gist, Drizzle docs

## Rules

**ALWAYS:**

- Use `generatedAlwaysAsIdentity()` for primary keys — not `serial`. This is the 2025 PostgreSQL standard.
- Use `snake_case` for database column names, `camelCase` for TypeScript variable names.
- Use `varchar` with explicit length limits for bounded strings. Use `text` for unbounded.
- Use `decimal` / `numeric` for money — never `real` or `doublePrecision`.
- Use JSONB with `.$type<T>()` for typed JSON columns.
- Use date mode with timezone for timestamps — 10-15% faster than string mode. Precision 3 (milliseconds) recommended.
- Apply `.defaultNow()` to `createdAt`. Apply `.$onUpdateFn(() => new Date())` to `updatedAt`.
- Keep ALL relations in a single `relations.ts` file to avoid cyclic dependencies. Use `() => reference` syntax in `.references()` for circular FK references.
- Separate table files per domain: `user.ts`, `company.ts`, `order.ts`.
- Index every FK column manually — PostgreSQL does NOT auto-index foreign keys.
- Use `sql.placeholder()` for prepared statements on frequently executed queries.
- Use `$inferSelect` and `$inferInsert` for TypeScript types. Use drizzle-zod for validation schemas.
- Use `strict: true` in `drizzle.config.ts`.
- Use `generate` + `migrate` for production. Pooled URL for runtime queries, direct URL for `drizzle-kit migrate`.

**NEVER:**

- Never use `drizzle-kit push` in production — it interprets column renames as drop-and-add (DATA LOSS).
- Never put relations in the same files as table definitions — causes cyclic imports.
- Never skip `strict: true` in drizzle config — unsafe migration generation.
- Never use `serial` — use `generatedAlwaysAsIdentity()`.
- Never use string mode timestamps when date mode works — unnecessary performance penalty.
- Never use `real` or `doublePrecision` for money.
- Never skip FK indexes — join performance degrades significantly.

**PREFER:**

- Prefer selective field loading (`columns: { id: true, name: true }`) over selecting everything.
- Prefer cursor-based pagination (`where(gt(table.id, lastId)).limit(20)`) over offset.
- Prefer partial indexes with `.where()` conditions for hot subsets — up to 275x improvement.
- Prefer covering indexes with `.include()` to avoid table lookups.
- Prefer composite indexes with equality columns first, then range columns.
- Prefer `z.coerce.date()` in drizzle-zod schemas for automatic string-to-date conversion.

**AVOID:**

- Avoid over-indexing — every index slows writes. Index what queries actually filter/sort/join on.
- Avoid loading all columns when only a few are needed — especially large text/jsonb fields.
- Avoid relying on Drizzle for rollbacks — it has NO built-in rollback. Create manual reverse migrations.

## Patterns

### Reusable Timestamp Columns

```typescript
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
};
```

### Table Definition

```typescript
export const users = pgTable("users", {
  id: bigint("id", { mode: "bigint" }).generatedAlwaysAsIdentity().primaryKey(),
  publicId: varchar("public_id", { length: 21 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  config: jsonb("config").$type<UserConfig>(),
  ...timestamps,
}, (table) => [
  index("users_email_idx").on(table.email),
]);
```

### Relations (separate file)

```typescript
// db/relations.ts — ALL relations in one file
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));
export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.userId], references: [users.id] }),
}));
```

### Prepared Statements

```typescript
const getUserById = db.query.users
  .findFirst({ where: eq(users.id, sql.placeholder("id")) })
  .prepare("get_user_by_id");

// Reuse — avoids re-parsing
const user = await getUserById.execute({ id: 123n });
```

### Index Strategies

```typescript
// Composite index (equality first, then range)
index("orders_status_date_idx").on(table.status, table.createdAt),

// Partial index (hot subset)
index("orders_active_idx").on(table.id).where(eq(table.status, "active")),

// GIN index for JSONB
index("users_config_idx").using("gin", table.config),
```

### Type-Safe Validation with drizzle-zod

```typescript
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
}).omit({ id: true, createdAt: true, updatedAt: true });

const selectUserSchema = createSelectSchema(users);
type NewUser = z.infer<typeof insertUserSchema>;
```

## Anti-Patterns

- Using `drizzle-kit push` on production databases — renames detected as drop+add = data loss.
- Putting `relations()` in the same file as `pgTable` — causes cyclic import crashes at scale.
- Using `serial` instead of `generatedAlwaysAsIdentity()` — serial is legacy and allows manual ID inserts.
- Querying all columns when only `id` and `name` needed — wastes bandwidth, especially with JSONB columns.
- Using offset pagination (`offset(1000)`) on large tables — recalculates every row. Use cursor-based.
- Missing FK indexes — PostgreSQL doesn't auto-index foreign keys. Joins become full table scans.
- Using string mode timestamps without a reason — 10-15% slower than date mode.
