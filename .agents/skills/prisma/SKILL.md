---
name: prisma
description: Prisma ORM — singleton client, N+1 prevention, cursor pagination, migration workflow, error codes. Load for schema.prisma, prisma/**.
---

# Prisma ORM Skill

> Loaded when: Working on `schema.prisma`, `prisma/**`
> Sources: Prisma official .cursorrules, Prisma best practices, Prisma query optimization docs

## Rules

**ALWAYS:**

- PascalCase model names, camelCase field names. Use `@map` / `@@map` for legacy DB naming.
- Explicit relations on both sides. `@@index` on every FK field and frequently-filtered field.
- Use singleton PrismaClient — never create multiple instances. Use a global singleton pattern:
  ```typescript
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
  export const prisma = globalForPrisma.prisma ?? new PrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
  ```
- Use `select` or `omit` on every query — don't return entire records when only specific fields are needed.
- Use `include` with `relationLoadStrategy: "join"` for related data — prevents N+1 queries.
- Use cursor-based pagination for large datasets: `cursor`, `take`, `skip: 1`.
- Use `$transaction` with interactive mode for complex multi-step operations. Keep transactions short.
- Catch `PrismaClientKnownRequestError` and map error codes: P2002 = unique constraint, P2025 = record not found.
- Use `prisma migrate dev` for development, `prisma migrate deploy` for production ONLY.
- Use `--create-only` to generate draft migrations for review before applying.
- Expand-and-contract for column renames and type changes — never destructive in one step.
- Use `connection_limit=1` for serverless. Use Prisma Accelerate for global connection pooling + query caching.
- Multi-file schema: supported in Prisma 6.7.0+ — organize by domain.

**NEVER:**

- Never use `findMany` without pagination (`take` / cursor) on large tables.
- Never skip `@@index` on FK columns — PostgreSQL doesn't auto-index them.
- Never use `$queryRaw` without parameterized inputs — SQL injection risk.
- Never run `prisma migrate dev` in production — it can reset data.
- Never create multiple PrismaClient instances — exhausts connection pool.
- Never return entire models to clients — use `select` to pick specific fields.
- Never use `deleteMany` / `updateMany` without a `where` clause — affects all rows.
- Never use synchronous operations in `$transaction` interactive mode — keep async.

**PREFER:**

- Prefer `select` over `include` when you don't need the full related record.
- Prefer `omit` (Prisma 6+) to exclude specific fields — cleaner than listing all includes.
- Prefer `createMany` with `skipDuplicates` for bulk inserts.
- Prefer `upsert` over manual find-then-create patterns.
- Prefer cursor-based pagination over offset for datasets > 1K rows.
- Prefer interactive `$transaction` for operations that depend on each other's results.

**AVOID:**

- Avoid N+1 queries: don't fetch a list then query related data per item in a loop.
- Avoid `findFirst` without `orderBy` when you need a deterministic result.
- Avoid nested `create` / `connectOrCreate` more than 2 levels deep — hard to debug.
- Avoid `@default(autoincrement())` — prefer `@default(uuid())` or UUIDv7 for new projects.

## Patterns

### Schema Conventions

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  posts     Post[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([email])
  @@map("users")
}

model Post {
  id       String @id @default(uuid())
  title    String
  content  String?
  authorId String @map("author_id")
  author   User   @relation(fields: [authorId], references: [id])

  @@index([authorId])
  @@map("posts")
}
```

### N+1 Prevention

```typescript
// Bad: N+1 — 1 query for users + N queries for posts
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { authorId: user.id } });
}

// Good: single query with join
const users = await prisma.user.findMany({
  include: { posts: true },
  relationLoadStrategy: "join",
});
```

### Cursor-Based Pagination

```typescript
const results = await prisma.post.findMany({
  take: 20,
  skip: 1,
  cursor: { id: lastPostId },
  orderBy: { createdAt: "desc" },
  select: { id: true, title: true, createdAt: true },
});
```

### Error Handling

```typescript
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

try {
  await prisma.user.create({ data });
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": throw new ConflictException("Email already exists");
      case "P2025": throw new NotFoundException("Record not found");
      case "P2003": throw new BadRequestException("FK constraint failed");
    }
  }
  throw error;
}
```

### Safe Migration Workflow

```bash
# 1. Generate draft migration for review
npx prisma migrate dev --create-only --name add_display_name

# 2. Review generated SQL in prisma/migrations/

# 3. Apply in development
npx prisma migrate dev

# 4. Production deployment
npx prisma migrate deploy
```

## Anti-Patterns

- Using `findMany({})` without `take` or `cursor` on tables with 100K+ rows — fetches entire table.
- Multiple `PrismaClient()` instantiations — each opens its own connection pool, exhausts DB connections.
- Using `$queryRaw` with string interpolation — SQL injection. Use `Prisma.sql` template tag.
- Running `prisma migrate dev` in CI/CD or production — use `prisma migrate deploy`.
- Missing `@@index` on FK columns — every join becomes a full table scan.
- Fetching entire records when only `id` and `name` are needed — use `select`.
- Sequential queries in a loop for related data — use `include` or `findMany` with `where: { id: { in: ids } }`.
