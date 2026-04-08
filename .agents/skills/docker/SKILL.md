---
name: docker
description: Docker containers — multi-stage builds, layer caching, security, health checks, non-root users. Load for Dockerfile*, docker-compose*.
---

# Docker Skill

> Loaded when: Working on `Dockerfile*`, `docker-compose*`, `.dockerignore`
> Sources: sanjeed5/docker.mdc, Snyk 10 Best Practices for Node.js Docker, Vercel Next.js Dockerfile

## Rules

**ALWAYS:**

- Multi-stage builds. Stages: `dependencies` → `build` → `runner`.
- Base images: `node:22-bookworm-slim` for Node.js (NOT Alpine — musl compatibility issues, scanner blind spots). `python:3.12-slim` for Python. Pin exact versions or SHA256 digests for max determinism.
- Layer caching: COPY `package.json` + lockfile FIRST → install deps → THEN copy source code.
- Use BuildKit cache mounts: `RUN --mount=type=cache,target=/root/.npm npm ci` or `--mount=type=cache,target=/root/.bun/install/cache bun install`.
- Non-root user: `USER node` for Node.js images. `--chown=node:node` on all COPY commands.
- CMD: run `node server.js` directly, NOT `npm start` (npm doesn't forward signals, extra process overhead).
- Use `--init` flag or `tini` for proper signal handling and zombie process reaping (PID 1 problem).
- Add health checks:
  ```dockerfile
  HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1
  ```
- Create `.dockerignore` with at minimum: `node_modules`, `.git`, `.next`, `dist`, `.env*`, `*.md`, `tests/`, `.vscode/`.
- Set `NODE_ENV=production` in production builds.
- Log to stdout/stderr only. Structured JSON format. Never write log files inside containers.

**NEVER:**

- Never use single-stage Dockerfiles with dev dependencies in production images.
- Never `COPY . .` before installing dependencies — breaks layer cache.
- Never use `:latest` tag — pin specific versions.
- Never run containers as root in production.
- Never use `ADD` when `COPY` suffices — `ADD` has URL fetch and tar extraction side effects.
- Never forget `.dockerignore` — leaks `.env`, `.git`, and bloats build context.
- Never use `npm start` as CMD — use `node server.js` directly.
- Never write log files inside containers — use stdout/stderr.
- Never hardcode secrets in Dockerfiles — use BuildKit secret mounts.

**PREFER:**

- Prefer `COPY` over `ADD` — explicit and predictable.
- Prefer `npm ci` / `bun install --frozen-lockfile` over `npm install` — deterministic.
- Prefer `--cap-drop all` then add only what's needed.
- Prefer read-only filesystem where possible: `--read-only --tmpfs /tmp`.
- Prefer named volumes for database persistence in Docker Compose.
- Prefer `depends_on` with health check conditions in Compose.

**AVOID:**

- Avoid Alpine for Node.js — musl libc causes native module compatibility issues and security scanner blind spots per Snyk research.
- Avoid `--no-new-privileges` bypass — always set it.
- Avoid storing state inside containers — use external volumes or databases.

## Patterns

### Node.js Multi-Stage Dockerfile

```dockerfile
# Stage 1: Dependencies
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    npm install --production=false

# Stage 2: Build
FROM deps AS build
COPY . .
RUN npm run build

# Stage 3: Runner
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package.json ./
USER nodejs
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Next.js Standalone Dockerfile

```dockerfile
FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Requires next.config.js: output: "standalone"
CMD ["node", "server.js"]
```

### Docker Compose for Dev

```yaml
services:
  db:
    image: postgres:16
    volumes: [pgdata:/var/lib/postgresql/data]
    environment: { POSTGRES_DB: app, POSTGRES_USER: dev, POSTGRES_PASSWORD: dev }
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev"]
      interval: 5s
      retries: 5
  app:
    build: { context: ., target: deps }
    volumes: [.:/app, /app/node_modules]
    depends_on: { db: { condition: service_healthy } }
    ports: ["3000:3000"]
volumes:
  pgdata:
```

### Framework Specifics

- **Next.js**: Use `output: "standalone"` in `next.config.js` for minimal images.
- **Astro SSR**: Set `HOST=0.0.0.0` environment variable.
- **NestJS**: 3-stage build with TypeScript compilation. No official Dockerfile.

## Anti-Patterns

- `COPY . .` as first step — invalidates dep cache on every source change.
- Using `:latest` — no reproducibility. Pin `node:22.12.0-bookworm-slim`.
- Running as root — container escape = host root access.
- `npm start` as CMD — npm doesn't forward SIGTERM, adds 10+ seconds to shutdown.
- Alpine for Node.js production — musl causes `sharp`, `bcrypt`, `canvas` failures.
- Missing `.dockerignore` — builds include `node_modules`, `.git`, `.env` files.
