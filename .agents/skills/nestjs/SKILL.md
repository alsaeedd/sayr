---
name: nestjs
description: NestJS backend architecture — request pipeline, modules, guards/interceptors/pipes, BullMQ, RFC 9457 errors. Load for *.module.ts, *.service.ts, *.controller.ts.
---

# NestJS Skill

> Loaded when: Working on `*.module.ts`, `*.guard.ts`, `*.service.ts`, `*.controller.ts`, `*.interceptor.ts`, `*.filter.ts`, `*.pipe.ts`
> Sources: Kadajett/agent-nestjs-skills AGENTS.md (40 rules), NarHakobyan/awesome-nest-boilerplate CLAUDE.md

## Rules

**ALWAYS:**

- Organize by feature module (users/, orders/), not by technical layer (controllers/, services/). Each module encapsulates its own controllers, services, DTOs, entities.
- One module per domain. Export services from dedicated modules. Never import another module's entity directly — use its exported service.
- Know the request pipeline order: Middleware → Guards → Interceptors (pre) → Pipes → Route Handler → Interceptors (post) → Exception Filters.
- Guards: auth and authorization ONLY. Return boolean. Use `@UseGuards()`. Apply `@Public()` decorator to skip.
- Interceptors: cross-cutting concerns — logging, response transformation, caching, timeout. NOT for business logic.
- Pipes: validation and transformation. Global `ValidationPipe` with `whitelist: true, transform: true, forbidNonWhitelisted: true`.
- Exception Filters: produce RFC 9457 Problem Details responses. Never leak stack traces in production.
- Every endpoint has request and response DTOs with `class-validator` decorators. Never accept raw `any` bodies.
- `@ApiOperation()` required on every endpoint. Swagger at `/api`.
- Use constructor injection exclusively. Never property injection, never `ModuleRef.get()`.
- Use `import type` for type-only imports. ESM imports with explicit `.ts` extensions.
- Use `unknown` over `any` everywhere.
- Use `ConfigModule.forRoot({ isGlobal: true })` with `ConfigService` — never `process.env` directly.
- Enable shutdown hooks: `app.enableShutdownHooks()`. Implement `onModuleDestroy` for cleanup.
- Use `EventEmitter2` for loose coupling between domains — never direct cross-module service calls for side effects.

**NEVER:**

- Never put business logic in controllers — controllers validate input, call service, return response. Keep them thin.
- Never use `any` type anywhere.
- Never use `process.env` directly — use `ConfigModule` / `ConfigService`.
- Never use Request scope unless absolutely necessary — it bubbles up the dependency tree and kills performance. Use `ClsModule` for async context instead.
- Never use Express-style middleware for things guards/interceptors handle.
- Never provide the same service in multiple modules — creates separate instances and state inconsistency.
- Never use circular module imports — extract shared logic into a third module or use events.
- Never return entities directly from controllers — use response DTOs with `@Exclude()` / `@Expose()`.
- Never use `synchronize: true` in production — use migrations.

**PREFER:**

- Prefer `EventEmitter2` for intra-service events over direct service dependencies.
- Prefer Repository pattern: encapsulate data access, keep business logic in services.
- Prefer interface segregation: small, focused interfaces over "fat" ones.
- Prefer symbol tokens for DI with interfaces (TypeScript interfaces erased at runtime).
- Prefer `ClsModule` for request context over request-scoped providers.

**AVOID:**

- Avoid "god services" — if a service name contains "And" or handles multiple domains, split it.
- Avoid eager loading all relations — load only what each endpoint needs.
- Avoid over-indexing database columns — slows writes.
- Avoid `@Global()` on non-cross-cutting modules (only for config, logging, database).

## Patterns

### Controller + Service + DTO

```typescript
// users.controller.ts — thin controller
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(":id")
  @ApiOperation({ summary: "Get user by ID" })
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }
}
```

### Global ValidationPipe

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

### BullMQ Queue Pattern

```typescript
// Constants enum for queue names
export const QUEUE_NAMES = { EMAIL: "email", REPORTS: "reports" } as const;

// Config factory with ConfigService for Redis
// Processors as separate injectable classes
// onModuleDestroy: drain in-flight jobs for graceful shutdown
// Dead Letter Queue for failed jobs
// Retry: exponential backoff { attempts: 3, backoff: { type: "exponential", delay: 1000 } }
```

### Rate Limiting

```typescript
// Stricter for auth (3-5/min), looser for reads (100+/min)
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 5, ttl: 60000 } })
```

### Error Handling

```typescript
// Custom exception filter → RFC 9457 Problem Details
@Catch(HttpException)
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    response.status(exception.getStatus()).json({
      type: "about:blank",
      title: exception.message,
      status: exception.getStatus(),
      detail: exception.message,
      instance: host.switchToHttp().getRequest().url,
    });
  }
}
```

## Anti-Patterns

- Putting fetch logic, validation, or business logic in controllers — move to services and pipes.
- Using `ModuleRef.get()` to dynamically resolve dependencies — hides dependencies, breaks testing.
- Circular module imports — #1 cause of runtime crashes. Extract shared logic to third module.
- Using `synchronize: true` in production — generates destructive DDL without migrations.
- Returning raw entities with `passwordHash`, `ssn` fields — use response DTOs with `@Exclude()`.
- N+1 queries: fetching list then querying per item in loop — use `relations` option or QueryBuilder joins.
- Fire-and-forget async without `.catch()` — crashes process on unhandled rejection.
