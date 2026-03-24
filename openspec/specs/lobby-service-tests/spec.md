## ADDED Requirements

### Requirement: lobbyKey generates correct Redis key
The system SHALL prefix lobby IDs with `lobby:` to form Redis keys.

#### Scenario: Standard lobby ID
- **WHEN** lobbyKey is called with a lobby ID "abc123"
- **THEN** it returns "lobby:abc123"

### Requirement: generateLobbyId produces unique IDs
The system SHALL generate hex-encoded lobby IDs that don't collide with existing lobbies.

#### Scenario: No collision
- **WHEN** generateLobbyId is called and the first generated ID is not in the lobbies map
- **THEN** it returns that ID (12-character hex string)

#### Scenario: Collision on first attempt
- **WHEN** generateLobbyId is called and the first generated ID already exists in the lobbies map
- **THEN** it retries and returns a different non-colliding ID

### Requirement: saveLobby persists lobby to Redis
The system SHALL serialize a lobby and store it in Redis with a 24-hour TTL.

#### Scenario: Successful save
- **WHEN** saveLobby is called with a lobby object
- **THEN** `redis.set` is called with the lobby key and JSON-serialized stored lobby, and `redis.expire` is called with 86400 seconds

### Requirement: loadLobby retrieves lobby from cache or Redis
The system SHALL return cached lobbies immediately, or fall back to Redis, parsing and caching the result.

#### Scenario: Lobby found in memory cache
- **WHEN** loadLobby is called with a lobbyId that exists in the in-memory `lobbies` map
- **THEN** the cached lobby is returned without hitting Redis

#### Scenario: Lobby found in Redis but not cache
- **WHEN** loadLobby is called with a lobbyId not in memory but present in Redis
- **THEN** the Redis value is parsed, converted via `fromStoredLobby`, cached in the `lobbies` map, and returned

#### Scenario: Lobby not found anywhere
- **WHEN** loadLobby is called with a lobbyId not in memory or Redis
- **THEN** null is returned

#### Scenario: Invalid JSON in Redis
- **WHEN** loadLobby is called and Redis returns invalid JSON
- **THEN** null is returned
