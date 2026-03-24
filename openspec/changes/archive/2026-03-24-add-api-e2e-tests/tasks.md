## 1. Server refactor for testability

- [x] 1.1 Extract `createApp()` factory function into `apps/lobby-server/src/app.ts` that creates and returns `{ httpServer, io, redis }` without calling `listen()`
- [x] 1.2 Update `apps/lobby-server/src/main.ts` to import and call `createApp()`, then call `listen()` — verify production startup is unchanged

## 2. E2e test project setup

- [x] 2.1 Create `apps/lobby-server-e2e/` directory with `project.json` (Nx project with `test` target) and `tsconfig.json`
- [x] 2.2 Create `apps/lobby-server-e2e/vitest.config.ts` with coverage configuration targeting `apps/lobby-server/src/**/*.ts`, output to `coverage/lobby-server-e2e/`
- [x] 2.3 Add `vitest.config.ts` path to the vitest workspace file so Nx discovers it
- [x] 2.4 Add `e2e:lobby` and `e2e:lobby:coverage` scripts to the root `package.json`

## 3. Test utilities and setup

- [x] 3.1 Create `apps/lobby-server-e2e/src/setup.ts` with `beforeAll`/`afterAll` hooks: import `createApp()`, bind to port 0, select random Redis database (0–15), flush DB on teardown, close all connections
- [x] 3.2 Create `apps/lobby-server-e2e/src/helpers.ts` with `createClient()`, `createLobbyHelper()`, and `joinLobbyHelper()` utilities

## 4. Core endpoint tests

- [x] 4.1 Create `apps/lobby-server-e2e/src/health.spec.ts` — test GET `/health` returns 200 with `{ status: "ok" }`
- [x] 4.2 Create `apps/lobby-server-e2e/src/lobby-lifecycle.spec.ts` — test `lobby:create` (with/without name), `lobby:join` (valid, invalid, missing lobbyId, rejoin), `lobby:exists` (existing, non-existent)
- [x] 4.3 Create `apps/lobby-server-e2e/src/voting.spec.ts` — test `lobby:vote` (numeric cards, special cards, null/clear, non-existent lobby), `lobby:reveal` (host, non-host, non-existent), `lobby:reset` (host, non-host, vote clearing)
- [x] 4.4 Create `apps/lobby-server-e2e/src/reconnection.spec.ts` — test `lobby:sync` (with clientId, without clientId, non-existent lobby)
- [x] 4.5 Create `apps/lobby-server-e2e/src/edge-cases.spec.ts` — test disconnect handling, permission checks, invalid data

## 5. Integration tests

- [x] 5.1 Create `apps/lobby-server-e2e/src/full-round.spec.ts` — complete voting round: create → join (2 participants) → vote (all 3) → reveal → verify → reset → verify cleared

## 6. Verification

- [x] 6.1 Run `nx test lobby-server-e2e` and verify all tests pass
- [x] 6.2 Run with `--coverage` and verify coverage report is generated at `coverage/lobby-server-e2e/`
- [x] 6.3 Verify full suite completes in under 60 seconds
- [x] 6.4 Verify parallel runs do not conflict (run two instances concurrently)
