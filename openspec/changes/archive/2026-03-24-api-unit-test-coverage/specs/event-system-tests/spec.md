## ADDED Requirements

### Requirement: appEvents emits and receives events
The system SHALL provide an EventEmitter-based event bus for internal application events.

#### Scenario: Emit and listen for LOBBY_CREATED
- **WHEN** a listener is registered for LOBBY_CREATED and the event is emitted
- **THEN** the listener receives the event payload with `lobbyId` and `timestamp`

#### Scenario: Emit and listen for LOBBY_JOINED
- **WHEN** a listener is registered for LOBBY_JOINED and the event is emitted
- **THEN** the listener receives the event payload with `lobbyId` and `timestamp`

### Requirement: registerStatsHandlers increments Redis counters
The system SHALL register event listeners that increment Redis counters for lobby creation and join events.

#### Scenario: Lobby created increments counter
- **WHEN** registerStatsHandlers is called and a LOBBY_CREATED event is emitted
- **THEN** `redis.incr` is called with "stats:total_lobbies"

#### Scenario: Lobby joined increments counter
- **WHEN** registerStatsHandlers is called and a LOBBY_JOINED event is emitted
- **THEN** `redis.incr` is called with "stats:total_joins"

#### Scenario: Redis error is caught
- **WHEN** `redis.incr` throws an error during a stats event
- **THEN** the error is logged to console.error and the process does not crash
