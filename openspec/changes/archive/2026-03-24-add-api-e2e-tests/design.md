## Context

The lobby server is a Socket.IO-based real-time API with Redis persistence. It has zero test coverage. The server is structured as a single `main.ts` entry point that creates an HTTP server, a Socket.IO server, and registers event handlers. Action handlers are split into individual files under `src/actions/`.

Key constraints from the requirements:
- Full suite must complete in under 60 seconds
- Must support parallel test runs across multiple worktrees
- Coverage reporting is desired

The monorepo already uses Vitest 4.0 with `@vitest/coverage-v8` installed.

## Goals / Non-Goals

**Goals:**
- E2e test coverage for all 8 Socket.IO events and the HTTP health endpoint
- Multi-client scenario testing (voting rounds, host permissions, reconnection)
- Sub-60-second execution time for the full suite
- Parallel-run safety across concurrent worktrees
- Server-side code coverage reporting

**Non-Goals:**
- Browser/UI e2e tests (this targets the API layer only)
- Load/stress testing
- Testing the web frontend
- Achieving 100% line coverage (goal is feature coverage; coverage reports help find gaps)

## Decisions

### 1. In-process server via extracted factory function

**Decision**: Refactor `main.ts` to extract server creation into an importable `createApp()` function. Tests import this directly and start the server in-process.

**Alternatives considered**:
- **Out-of-process (spawn child process)**: More realistic but adds ~2s startup overhead per suite, complicates coverage collection (requires `NODE_V8_COVERAGE` + `c8 report` pipeline), and makes debugging harder.
- **In-process via dynamic import of main.ts**: Fragile due to side effects at module load time (Redis connection, `listen()` call). Would require env var gymnastics.

**Rationale**: In-process gives us free coverage via Vitest's built-in `@vitest/coverage-v8`, fastest possible startup (~50ms), and easy debugging. The refactor is minimal — extract a function, call it from `main.ts`. The factory function is a standard testability pattern.

### 2. Vitest as test runner

**Decision**: Use Vitest, the same test framework already configured in the monorepo.

**Alternatives considered**:
- **Playwright/Cypress**: Designed for browser e2e, overkill for API-only testing
- **Jest**: Would add a second test framework to the monorepo
- **Node.js built-in test runner**: Less mature, no coverage integration with existing setup

**Rationale**: Zero new dependencies for the test runner. Consistent with existing monorepo tooling. Native TypeScript support via Vite's transform pipeline.

### 3. Parallel-run isolation via dynamic ports + Redis database selection

**Decision**: Each test run binds the server to port 0 (OS-assigned random port) and uses a dedicated Redis database number (0–15) selected randomly at test start.

**Alternatives considered**:
- **Redis key prefix per run**: Would require production code changes to make the `lobby:` and `stats:` prefixes configurable.
- **Separate Redis instances**: Overkill; adds Docker complexity.
- **Accept collisions (random lobby IDs)**: Lobby IDs won't collide, but `stats:total_lobbies` and `stats:total_joins` are global keys that would produce flaky assertions if shared.

**Rationale**: Redis supports 16 databases out of the box. `SELECT <db>` before tests provides full key-space isolation with zero production code changes. 16 databases is more than enough for reasonable parallelism. Dynamic port allocation is a standard pattern.

### 4. Coverage via @vitest/coverage-v8

**Decision**: Use the already-installed `@vitest/coverage-v8` package with Vitest's built-in coverage support.

**Alternatives considered**:
- **c8 wrapping a child process**: Required for out-of-process; unnecessary for in-process.
- **nyc/Istanbul instrumentation**: Older approach, slower due to code transformation.

**Rationale**: Since we're testing in-process, Vitest's coverage "just works" — no extra tooling needed. Generates lcov, text, and HTML reports. Already a dev dependency.

### 5. Test file organization

**Decision**: One test file per logical feature area, colocated in `apps/lobby-server-e2e/src/`:
- `lobby-lifecycle.spec.ts` — create, join, exists, disconnect
- `voting.spec.ts` — vote, reveal, reset
- `reconnection.spec.ts` — sync, reconnection scenarios
- `health.spec.ts` — HTTP health endpoint
- `edge-cases.spec.ts` — error handling, invalid inputs, permission checks

**Rationale**: Feature-based grouping keeps files focused and allows running subsets via Vitest's filter. Each file is independent and can run in any order.

## Risks / Trade-offs

- **[Small production code refactor]** → Extracting `createApp()` from `main.ts` is a minimal, safe change. The function is called identically in production; only the import path changes for tests. Mitigation: the refactor is a single commit, easily reviewed.

- **[Redis database limit]** → Only 16 databases available. If more than ~12 parallel runs occur simultaneously, collisions are possible. Mitigation: 12+ simultaneous worktrees is unlikely in practice; can be increased via Redis config if needed.

- **[In-process != true e2e]** → Tests share the same Node.js process as the server. A crash in the server could crash the test runner. Mitigation: Socket.IO servers are stable; uncaught exceptions in handlers don't crash the process. This trade-off is worth it for the speed and coverage benefits.

- **[Captcha bypass in tests]** → Tests will not set `TURNSTILE_SECRET_KEY`, which makes the server accept all captcha tokens (existing dev mode behavior). Mitigation: this is the intended dev behavior; captcha verification is a thin external API call that should be tested via unit tests or staging, not e2e.
