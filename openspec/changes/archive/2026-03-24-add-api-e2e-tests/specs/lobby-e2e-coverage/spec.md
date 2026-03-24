## ADDED Requirements

### Requirement: Lobby creation tests
The test suite SHALL verify lobby creation via the `lobby:create` event.

#### Scenario: Create lobby with name
- **WHEN** a client emits `lobby:create` with `{ name: "Alice" }`
- **THEN** the ack SHALL contain `{ ok: true, lobbyId, hostId, clientId }` with non-empty string values
- **AND** the participants array SHALL contain one entry with the given name and `isAdmin: true`

#### Scenario: Create lobby without name
- **WHEN** a client emits `lobby:create` with `{}` or no data
- **THEN** the ack SHALL contain `{ ok: true }` with a generated lobby ID
- **AND** the participant SHALL have a default or empty name

### Requirement: Lobby join tests
The test suite SHALL verify joining lobbies via the `lobby:join` event.

#### Scenario: Join existing lobby
- **WHEN** a second client emits `lobby:join` with a valid `lobbyId` and `{ name: "Bob" }`
- **THEN** the ack SHALL contain `{ ok: true }` with the lobby's participant list including both the host and the joiner
- **AND** the host's socket SHALL receive a `lobby:participant-joined` event

#### Scenario: Join non-existent lobby
- **WHEN** a client emits `lobby:join` with a non-existent `lobbyId`
- **THEN** the ack SHALL contain `{ ok: false }` with an error message

#### Scenario: Join without lobbyId
- **WHEN** a client emits `lobby:join` with `{}` (missing lobbyId)
- **THEN** the ack SHALL contain `{ ok: false, error: "Missing lobbyId" }`

#### Scenario: Rejoin with existing clientId
- **WHEN** a client emits `lobby:join` with a `clientId` that already exists in the lobby
- **THEN** the ack SHALL contain `{ ok: true }` and the participant list SHALL not have duplicates

### Requirement: Lobby exists tests
The test suite SHALL verify the `lobby:exists` event.

#### Scenario: Check existing lobby
- **WHEN** a client emits `lobby:exists` with a valid `lobbyId`
- **THEN** the ack SHALL return `{ ok: true }`

#### Scenario: Check non-existent lobby
- **WHEN** a client emits `lobby:exists` with a non-existent `lobbyId`
- **THEN** the ack SHALL return `{ ok: false }`

### Requirement: Voting tests
The test suite SHALL verify the `lobby:vote` event.

#### Scenario: Cast a vote
- **WHEN** a participant emits `lobby:vote` with `{ lobbyId, card: 5 }`
- **THEN** the ack SHALL contain `{ ok: true }`
- **AND** other participants in the lobby SHALL receive a `lobby:voted` event with `{ lobbyId, clientId, card: 5 }`

#### Scenario: Cast vote with special cards
- **WHEN** a participant emits `lobby:vote` with card values `"?"` and `"☕"`
- **THEN** the ack SHALL contain `{ ok: true }` for each

#### Scenario: Clear vote
- **WHEN** a participant emits `lobby:vote` with `{ lobbyId, card: null }`
- **THEN** the ack SHALL contain `{ ok: true }`
- **AND** the vote SHALL be cleared

#### Scenario: Vote in non-existent lobby
- **WHEN** a client emits `lobby:vote` with a non-existent `lobbyId`
- **THEN** the ack SHALL contain `{ ok: false }` with an error message

### Requirement: Reveal tests
The test suite SHALL verify the `lobby:reveal` event.

#### Scenario: Host reveals votes
- **WHEN** the lobby host emits `lobby:reveal` with `{ lobbyId }`
- **THEN** the ack SHALL contain `{ ok: true }`
- **AND** all participants SHALL receive a `lobby:revealed` event with `{ lobbyId }`

#### Scenario: Non-host attempts reveal
- **WHEN** a non-host participant emits `lobby:reveal` with `{ lobbyId }`
- **THEN** the ack SHALL contain `{ ok: false }` with an error indicating insufficient permissions

#### Scenario: Reveal non-existent lobby
- **WHEN** a client emits `lobby:reveal` with a non-existent `lobbyId`
- **THEN** the ack SHALL contain `{ ok: false }` with an error message

### Requirement: Reset tests
The test suite SHALL verify the `lobby:reset` event.

#### Scenario: Host resets lobby
- **WHEN** the lobby host emits `lobby:reset` with `{ lobbyId }` after votes have been cast
- **THEN** the ack SHALL contain `{ ok: true }`
- **AND** all participants SHALL receive a `lobby:reset` event
- **AND** a subsequent sync SHALL show all votes cleared and `isRevealed: false`

#### Scenario: Non-host attempts reset
- **WHEN** a non-host participant emits `lobby:reset` with `{ lobbyId }`
- **THEN** the ack SHALL contain `{ ok: false }` with an error indicating insufficient permissions

### Requirement: Sync tests
The test suite SHALL verify the `lobby:sync` event for reconnection scenarios.

#### Scenario: Sync with valid lobby and clientId
- **WHEN** a client emits `lobby:sync` with `{ lobbyId, clientId }` for an existing lobby
- **THEN** the ack SHALL contain `{ ok: true, lobbyId, hostId, participants, isRevealed }`

#### Scenario: Sync without clientId
- **WHEN** a client emits `lobby:sync` with `{ lobbyId }` (no clientId)
- **THEN** the ack SHALL return the lobby state

#### Scenario: Sync non-existent lobby
- **WHEN** a client emits `lobby:sync` with a non-existent `lobbyId`
- **THEN** the ack SHALL contain `{ ok: false }` with an error message

### Requirement: Disconnect handling tests
The test suite SHALL verify disconnect behavior.

#### Scenario: Client disconnects from lobby
- **WHEN** a participant disconnects their socket
- **THEN** other participants SHALL eventually receive notification of the disconnection

### Requirement: Health endpoint tests
The test suite SHALL verify the HTTP health check endpoint.

#### Scenario: Health check returns ok
- **WHEN** an HTTP GET request is made to `/health`
- **THEN** the response status SHALL be 200
- **AND** the body SHALL be `{ "status": "ok" }`

### Requirement: Full voting round integration test
The test suite SHALL include an end-to-end scenario covering a complete voting round.

#### Scenario: Complete voting round
- **WHEN** a host creates a lobby, two participants join, all three vote, the host reveals, and the host resets
- **THEN** each step SHALL succeed with `{ ok: true }`
- **AND** all broadcast events SHALL be received by the appropriate participants
- **AND** after reset, all votes SHALL be cleared
