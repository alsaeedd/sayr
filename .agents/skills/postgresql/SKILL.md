---
name: postgresql
description: PostgreSQL fundamentals — identity columns, indexing, migration safety, RLS, JSONB, partitioning. Load for *.sql, migrations/**.
---

# PostgreSQL Skill

> Loaded when: Working on `*.sql`, `migrations/**`, database schemas
> Sources: Timescale pg-aiguide (design-postgres-tables SKILL.md), Bytebase SQL Review, Supabase AI conventions

## Rules

**ALWAYS:**

- Primary keys: `BIGINT GENERATED ALWAYS AS IDENTITY` for internal IDs. Use UUIDv7 for public-facing IDs (95% of bigserial perf vs UUIDv4 at 33%).
- PostgreSQL does NOT auto-create indexes on FK columns — add them manually on EVERY foreign key.
- Naming: `snake_case` everything. Singular table names. 63-char max identifiers. Suffixes: `_pkey`, `_key`, `_idx`, `_excl`.
- Every table gets: `id` (identity), `created_at` (`timestamptz DEFAULT now()`), `updated_at` (`timestamptz DEFAULT now()`).
- Use `TEXT` with `CHECK (LENGTH(col) <= n)` for strings — not `CHAR(n)` or `VARCHAR(n)`.
- Use `TIMESTAMPTZ` always — never bare `TIMESTAMP` (loses timezone context).
- Use `NUMERIC(p,s)` for money — NEVER `float`, `real`, or `double precision`.
- Use `BOOLEAN NOT NULL` — avoid nullable booleans (tri-state ambiguity).
- Add `NOT NULL` everywhere semantically required. Use `DEFAULT` for common values.
- Set `lock_timeout = '5s'` before every DDL statement in migrations.
- Use `CREATE INDEX CONCURRENTLY` for production indexes (cannot run inside transaction).
- Add columns as nullable first → backfill in batches → then add NOT NULL constraint. Never rename columns in a single step — expand-and-contract.
- Enable RLS on every table in multi-tenant apps. Add explicit application-level filters alongside RLS.
- Cursor-based pagination for large datasets. Never `OFFSET` on tables > 10K rows.
- Specify `SELECT` columns explicitly — never `SELECT *` in production queries.
- Connection pooling: PgBouncer or Neon built-in pooling in transaction mode. Pooled URL for runtime, direct URL for migrations.

**NEVER:**

- Never store money as `float` / `real` / `double precision`.
- Never skip FK indexes — degrades join performance significantly.
- Never use `OFFSET` pagination on large datasets — use cursor-based.
- Never use `SELECT *` in production queries.
- Never trust application-only validation without DB-level constraints.
- Never use `serial` — use `GENERATED ALWAYS AS IDENTITY`.
- Never use `timestamp` without timezone — use `timestamptz`.
- Never use `char(n)` or `varchar(n)` — use `text` with `CHECK`.
- Never use the `money` type — use `numeric`.
- Never use `POINT`, `LINE`, `POLYGON`, `CIRCLE` — use PostGIS `geometry` instead.

**PREFER:**

- Prefer `BIGINT` over `INTEGER` for IDs — future-proofs growth.
- Prefer partial indexes (`WHERE status = 'active'`) for soft-delete queries — massive performance wins.
- Prefer covering indexes (`INCLUDE (col)`) for index-only scans on hot queries.
- Prefer composite indexes with equality columns first, then range columns.
- Prefer `CREATE TYPE AS ENUM` for stable value sets. Use `TEXT + CHECK` for evolving business logic.
- Prefer `tsvector + tsquery + GIN` for full-text search. Add `pg_trgm` for fuzzy/typo tolerance.
- Prefer declarative partitioning or TimescaleDB over table inheritance.

**AVOID:**

- Avoid quoting identifiers — use lowercase `snake_case` to prevent case-sensitivity issues.
- Avoid over-indexing — every index slows writes. Index only what queries actually use.
- Avoid wide-row updates in hot tables — separate hot columns from cold ones.
- Avoid `JSONB` for data queried frequently by specific fields — promote to columns.

## Patterns

### Index Strategy Matrix

```
B-tree (default)  → Equality/range: =, <, >, BETWEEN, ORDER BY
GIN               → JSONB (@>, ?, ?|, ?&), arrays, full-text search (@@)
GiST              → Ranges, geometry, exclusion constraints
BRIN              → Huge naturally-ordered tables (time-series), minimal storage
Expression index  → LOWER(email) for case-insensitive search (query must match exactly)
Partial index     → WHERE clause for hot subsets (e.g., active records)
Covering index    → INCLUDE (col) for index-only scans
```

### JSONB Guidance

```sql
-- GIN index for containment queries
CREATE INDEX idx_config ON users USING gin (config);

-- jsonb_path_ops: smaller/faster, containment-only
CREATE INDEX idx_config ON users USING gin (config jsonb_path_ops);

-- Scalar field queried frequently → promote to column or expression index
CREATE INDEX idx_config_theme ON users ((config->>'theme'));
```

### Safe Migration Pattern

```sql
-- Step 1: Add nullable column
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Step 2: Backfill in batches (outside transaction)
UPDATE users SET display_name = name WHERE id BETWEEN 1 AND 10000;

-- Step 3: Add constraint
ALTER TABLE users ALTER COLUMN display_name SET NOT NULL;
```

### Partitioning Decision

```
> 100M rows OR periodic data maintenance?
├── Time-series data → RANGE partitioning by created_at (or TimescaleDB)
├── Discrete categories → LIST partitioning by region/status
└── Even distribution → HASH partitioning by user_id
```

### Key Extensions

```
pgcrypto    → crypt() for password hashing
pg_trgm     → Fuzzy text search, similarity(), GIN for LIKE '%pattern%'
citext      → Case-insensitive text (prefer LOWER() expression index)
timescaledb → Time-series automation
postgis     → Geospatial support
pgvector    → Vector similarity search
```

## Anti-Patterns

- Using `serial` instead of `GENERATED ALWAYS AS IDENTITY` — serial is legacy, doesn't prevent manual inserts.
- Missing FK indexes — PostgreSQL does NOT auto-index foreign keys (unlike MySQL). Joins become full scans.
- Using `OFFSET 1000000` for deep pagination — recalculates every row. Use cursor-based: `WHERE id > last_seen_id`.
- Using `float` for money — rounding errors accumulate. `NUMERIC(12,2)` is correct.
- Using `timestamp` without timezone — silently drops timezone context. Use `timestamptz`.
- Adding `NOT NULL` column in one step on large tables — locks table during full rewrite. Add nullable → backfill → add constraint.
- Running `CREATE INDEX` (non-CONCURRENTLY) on production — locks table for writes. Always use `CONCURRENTLY`.
