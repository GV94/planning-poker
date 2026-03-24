## ADDED Requirements

### Requirement: Server factory function for testability
The lobby server SHALL export a `createApp()` function from a dedicated module (`src/app.ts`) that creates and returns the HTTP server, Socket.IO server, and Redis client without calling `listen()`. The existing `main.ts` SHALL import and call this function, preserving identical production behavior.

#### Scenario: Production startup unchanged
- **WHEN** the lobby server is started via `node main.js`
- **THEN** the server SHALL bind to the configured port and behave identically to the pre-refactor version

#### Scenario: Test imports factory function
- **WHEN** a test file imports `createApp()` from `src/app.ts`
- **THEN** it SHALL receive an object with `{ httpServer, io, redis }` that is not yet listening on any port

### Requirement: Dynamic port allocation
Each test run SHALL bind the server to port 0 so the operating system assigns a random available port. The test setup SHALL read back the assigned port and configure Socket.IO clients to connect to it.

#### Scenario: Server binds to random port
- **WHEN** a test suite starts and calls `httpServer.listen(0)`
- **THEN** the server SHALL be assigned a random available port
- **AND** `httpServer.address().port` SHALL return the assigned port number

#### Scenario: Multiple test runs bind concurrently
- **WHEN** two test runs start simultaneously in different worktrees
- **THEN** each SHALL receive a distinct port number with no conflicts

### Requirement: Redis database isolation for parallel runs
Each test run SHALL select a random Redis database number (0–15) at startup and issue a `SELECT` command before any test operations. All Redis keys created during the test run SHALL exist only in that database. The database SHALL be flushed (`FLUSHDB`) during teardown.

#### Scenario: Test run selects isolated database
- **WHEN** a test suite starts
- **THEN** it SHALL select a random Redis database number between 0 and 15
- **AND** all subsequent Redis operations SHALL use that database

#### Scenario: Teardown cleans up Redis state
- **WHEN** a test suite completes (success or failure)
- **THEN** it SHALL flush the selected Redis database
- **AND** it SHALL close the Redis connection

#### Scenario: Parallel runs use different databases
- **WHEN** two test runs execute concurrently
- **THEN** they SHALL operate on different Redis databases with independent key spaces (with high probability)

### Requirement: Test helper utilities
The test project SHALL provide helper utilities for common operations: creating a connected Socket.IO client, creating a lobby and returning the connection details, and joining a lobby as a new participant.

#### Scenario: Create connected client helper
- **WHEN** a test calls the `createClient()` helper
- **THEN** it SHALL return a connected Socket.IO client pointing at the test server's dynamic port

#### Scenario: Create lobby helper
- **WHEN** a test calls `createLobbyHelper(name?)`
- **THEN** it SHALL create a lobby via `lobby:create`, return `{ socket, lobbyId, hostId, clientId }`, and the lobby SHALL exist on the server

#### Scenario: Join lobby helper
- **WHEN** a test calls `joinLobbyHelper(lobbyId, name?)`
- **THEN** it SHALL connect a new client and join the specified lobby, returning `{ socket, clientId }`

### Requirement: Test project structure
The e2e test project SHALL be located at `apps/lobby-server-e2e/` with its own `vitest.config.ts` and `project.json`. It SHALL be registered as an Nx project with a `test` target.

#### Scenario: Nx recognizes the test project
- **WHEN** `nx show projects` is run
- **THEN** `lobby-server-e2e` SHALL appear in the project list

#### Scenario: Tests run via pnpm script
- **WHEN** `pnpm e2e:lobby` is run from the repository root
- **THEN** the e2e test suite SHALL execute and report results

### Requirement: Execution time under 60 seconds
The full e2e test suite SHALL complete in under 60 seconds on a standard development machine.

#### Scenario: Full suite execution time
- **WHEN** the complete e2e test suite runs
- **THEN** it SHALL finish in under 60 seconds wall-clock time
