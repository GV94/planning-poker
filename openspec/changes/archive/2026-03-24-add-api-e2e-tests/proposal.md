## Why

The lobby server has zero test coverage. All Socket.IO endpoints (create, join, vote, reveal, reset, sync, exists, disconnect) and supporting features (captcha, Redis persistence, stats tracking) are untested. An e2e test suite is needed to catch regressions before they reach production, especially as the codebase grows.

## What Changes

- Add a new e2e test project under `apps/lobby-server-e2e/` targeting the live lobby server over Socket.IO
- Cover all Socket.IO events: `lobby:create`, `lobby:join`, `lobby:exists`, `lobby:vote`, `lobby:reveal`, `lobby:reset`, `lobby:sync`, and `disconnect` handling
- Test multi-client scenarios (voting, revealing, host permissions, reconnection)
- Add test scripts to the root `package.json` for running the e2e suite
- Investigate and integrate server-side code coverage collection (Istanbul/c8) to identify untested paths

## Capabilities

### New Capabilities
- `e2e-test-infrastructure`: Test runner setup, server lifecycle management, Redis isolation, and parallel-run safety
- `lobby-e2e-coverage`: Full e2e test coverage of all lobby server Socket.IO endpoints and edge cases
- `server-coverage-reporting`: Server-side code coverage collection during e2e test runs to identify gaps

### Modified Capabilities

_None — this is a new test project with no changes to existing specs._

## Impact

- **New files**: `apps/lobby-server-e2e/` project with Vitest config, test utilities, and test files
- **Dependencies**: `socket.io-client` (already in monorepo), potentially `c8`/`nyc` for coverage
- **Scripts**: New `pnpm` scripts for running e2e tests
- **CI**: Test suite designed to complete in under 60 seconds; parallel-run safe via per-run Redis key prefixes and dynamic port allocation
- **No changes** to production code, APIs, or existing packages
