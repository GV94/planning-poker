## Context

The `lobby-server` app is a Socket.IO-based WebSocket server that manages planning poker lobbies. It has 11 source modules across 4 categories: action handlers (8), a lobby service with Redis persistence, utility functions, and an event/stats system. There are currently zero tests. The project already uses Vitest 4.0.0 with `@vitest/coverage-v8` in the workspace, but no vitest config exists for `lobby-server`.

## Goals / Non-Goals

**Goals:**
- 100% unit test line and branch coverage for all `lobby-server/src` modules
- Tests run fast (no real Redis, no real network) via mocking
- Integrated into the Nx workspace so `nx test lobby-server` works
- Tests serve as living documentation of the API's behavior

**Non-Goals:**
- Integration/E2E tests with real Redis or Socket.IO connections
- Testing `main.ts` server bootstrap (side-effectful wiring code)
- Modifying any production source code to make it testable
- Frontend or shared-types test coverage

## Decisions

### 1. Vitest with vi.mock for all external dependencies
**Choice**: Use Vitest's built-in `vi.mock` to mock Redis, Socket.IO, and fetch (for captcha).
**Rationale**: The project already uses Vitest. No additional mocking library needed. `vi.mock` handles ESM module mocking well.
**Alternative considered**: Using `ioredis-mock` or `redis-memory-server` — rejected because it adds dependencies and moves toward integration testing.

### 2. Test files co-located with source files
**Choice**: Place test files next to source as `*.spec.ts` (e.g., `utils.spec.ts`, `actions/vote.spec.ts`).
**Rationale**: Matches the existing pattern in `apps/web/` and is the Vitest/Nx convention. Easy to find related tests.
**Alternative considered**: Separate `__tests__/` directory — rejected because it doesn't match the existing project convention.

### 3. Mock LobbyService module for action handler tests
**Choice**: Mock the entire `../LobbyService.js` module in action handler tests, providing controlled `lobbies`, `connections`, and `loadLobby`/`saveLobby` stubs.
**Rationale**: Action handlers import from LobbyService directly. Mocking the module boundary keeps tests focused on handler logic. LobbyService itself gets tested separately with mocked Redis.
**Alternative considered**: Dependency injection refactor — rejected because it requires production code changes (a non-goal).

### 4. Mock Socket.IO with plain objects
**Choice**: Create lightweight mock objects implementing the Socket/Server interfaces used by handlers (e.g., `{ id, join, emit, handshake }` for Socket, `{ to: () => ({ emit }) }` for Server).
**Rationale**: Handlers only use a few Socket.IO methods. Full socket mocks are unnecessary overhead.

### 5. Vitest config for lobby-server
**Choice**: Add `vitest.config.ts` in `apps/lobby-server/` with Node environment (not jsdom).
**Rationale**: Server-side code doesn't need a DOM. Node environment is correct and faster.

## Risks / Trade-offs

- **Mocking may mask integration bugs** → Accepted trade-off; integration tests are a non-goal for this change. The mocks are thin and follow actual interfaces closely.
- **LobbyService module-level side effects (Redis connect)** → `vi.mock` intercepts the import before side effects run, so tests won't attempt real Redis connections.
- **`main.ts` excluded from coverage** → Server bootstrap is wiring code with side effects. Testing it requires spinning up a real server, which is integration territory. Coverage config will exclude it.
