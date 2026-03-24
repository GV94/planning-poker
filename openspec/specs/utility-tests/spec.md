## ADDED Requirements

### Requirement: normalizeName trims and defaults to Anonymous
The system SHALL trim whitespace from names and return "Anonymous" for empty/missing names.

#### Scenario: Valid name with whitespace
- **WHEN** normalizeName is called with "  Alice  "
- **THEN** it returns "Alice"

#### Scenario: Empty string
- **WHEN** normalizeName is called with ""
- **THEN** it returns "Anonymous"

#### Scenario: Undefined
- **WHEN** normalizeName is called with undefined
- **THEN** it returns "Anonymous"

#### Scenario: Whitespace-only string
- **WHEN** normalizeName is called with "   "
- **THEN** it returns "Anonymous"

### Requirement: serializeParticipants converts Map to array
The system SHALL convert a lobby's participants Map to an array of ParticipantInfo.

#### Scenario: Multiple participants
- **WHEN** serializeParticipants is called with a lobby containing 2 participants
- **THEN** it returns an array of 2 ParticipantInfo objects

#### Scenario: Empty participants
- **WHEN** serializeParticipants is called with a lobby containing no participants
- **THEN** it returns an empty array

### Requirement: toStoredLobby converts lobby for storage
The system SHALL convert a Lobby (with Map) to a StoredLobby (with array) for JSON serialization.

#### Scenario: Standard conversion
- **WHEN** toStoredLobby is called with a Lobby object
- **THEN** it returns a StoredLobby with `id`, `hostId`, `isRevealed`, and `participants` as an array

### Requirement: fromStoredLobby restores lobby from storage
The system SHALL convert a StoredLobby (with array) back to a Lobby (with Map).

#### Scenario: Standard conversion
- **WHEN** fromStoredLobby is called with a StoredLobby object
- **THEN** it returns a Lobby with participants as a Map keyed by clientId

### Requirement: verifyCaptcha validates Turnstile tokens
The system SHALL verify CAPTCHA tokens against Cloudflare Turnstile, bypassing when no secret is configured.

#### Scenario: No secret configured (dev mode)
- **WHEN** verifyCaptcha is called and TURNSTILE_SECRET_KEY is not set
- **THEN** it returns true (bypass)

#### Scenario: No token provided with secret configured
- **WHEN** verifyCaptcha is called with no token but TURNSTILE_SECRET_KEY is set
- **THEN** it returns false

#### Scenario: Valid token
- **WHEN** verifyCaptcha is called with a valid token and Turnstile returns `{ success: true }`
- **THEN** it returns true

#### Scenario: Invalid token
- **WHEN** verifyCaptcha is called with a token and Turnstile returns `{ success: false }`
- **THEN** it returns false

#### Scenario: Network error during verification
- **WHEN** verifyCaptcha is called and fetch throws an error
- **THEN** it returns false

#### Scenario: IP address forwarded
- **WHEN** verifyCaptcha is called with an IP address
- **THEN** the `remoteip` field is included in the FormData sent to Turnstile
