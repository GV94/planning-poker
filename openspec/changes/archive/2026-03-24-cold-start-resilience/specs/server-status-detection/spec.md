## ADDED Requirements

### Requirement: Health check on page load
The system SHALL send a `GET /health` request to the backend on every page load to determine server availability.

#### Scenario: Server is already awake
- **WHEN** the health check receives a response within 2 seconds
- **THEN** the server status SHALL transition to `online`

#### Scenario: Server is sleeping (cold start)
- **WHEN** the health check does not receive a response within 2 seconds
- **THEN** the server status SHALL transition to `waking`
- **AND** when the response eventually arrives, the status SHALL transition to `online`

#### Scenario: Health check fails permanently
- **WHEN** the health check request fails or times out after 60 seconds
- **THEN** the system SHALL retry the health check automatically
- **AND** the status SHALL remain `waking` during retries

### Requirement: Server status context provider
The system SHALL provide a React context (`ServerStatusProvider`) at the root layout level that exposes the current server status to all child components.

#### Scenario: Status values
- **WHEN** the context is consumed by any component
- **THEN** it SHALL expose `status` as one of `'checking'`, `'waking'`, `'online'`, or `'disconnected'`
- **AND** it SHALL expose `isReady` as a boolean that is `true` only when status is `'online'`

### Requirement: Socket disconnect detection
The system SHALL monitor the active Socket.IO connection and update the server status when the connection is lost.

#### Scenario: Socket disconnects while in a lobby
- **WHEN** the Socket.IO connection drops after previously being connected
- **THEN** the server status SHALL transition to `disconnected`

#### Scenario: Socket reconnects
- **WHEN** the Socket.IO connection is re-established after being disconnected
- **THEN** the server status SHALL transition to `online`
