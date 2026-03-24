## Why

The `lobby-server` API has zero unit test coverage. All 11 source modules — including action handlers, the lobby service, captcha verification, and utility functions — are completely untested. This creates risk for regressions as the codebase evolves, and makes it difficult to refactor with confidence.

## What Changes

- Add unit tests for all `lobby-server` source modules to achieve 100% line/branch coverage
- Add a Vitest configuration for the lobby-server app
- Mock external dependencies (Redis, Socket.IO, fetch) to keep tests fast and isolated
- Add a test script to `apps/lobby-server/project.json` for Nx integration

## Capabilities

### New Capabilities
- `lobby-action-tests`: Unit tests for all 8 Socket.IO action handlers (create-lobby, join-lobby, vote, reveal, reset, sync, exists, disconnect)
- `lobby-service-tests`: Unit tests for LobbyService functions (lobbyKey, generateLobbyId, saveLobby, loadLobby)
- `utility-tests`: Unit tests for utils (normalizeName, serializeParticipants, toStoredLobby, fromStoredLobby) and captcha verification
- `event-system-tests`: Unit tests for the event system (appEvents, stats-handlers)

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **Code**: `apps/lobby-server/` — new test files alongside source, new vitest config
- **Dependencies**: May need `vitest` config additions for the lobby-server app; mocking libraries for Redis and Socket.IO
- **CI**: Test command becomes available via `nx test lobby-server`
- **No runtime code changes** — this is purely additive test infrastructure
