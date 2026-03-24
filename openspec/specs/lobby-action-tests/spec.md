## ADDED Requirements

### Requirement: handleCreateLobby creates a lobby and acknowledges the caller
The system SHALL create a new lobby with a unique ID, register the host as admin participant, persist to Redis, emit internal events, join the socket to the room, and acknowledge with full lobby state.

#### Scenario: Successful lobby creation with name
- **WHEN** handleCreateLobby is called with `{ name: "Alice", captchaToken: "valid" }` and captcha passes
- **THEN** a new lobby is created with a generated ID, the host participant has name "Alice" and `isAdmin: true`, `saveLobby` is called, `appEvents` emits `LOBBY_CREATED`, the socket joins the lobby room, and the ack callback receives `{ ok: true, lobbyId, hostId, clientId, participants, isRevealed: false }`

#### Scenario: Successful lobby creation without name
- **WHEN** handleCreateLobby is called with no name
- **THEN** the host participant name defaults to "Anonymous"

#### Scenario: CAPTCHA verification fails
- **WHEN** handleCreateLobby is called and `verifyCaptcha` returns false
- **THEN** the ack callback receives `{ ok: false, error: "Invalid CAPTCHA" }` and no lobby is created

#### Scenario: No ack callback provided
- **WHEN** handleCreateLobby is called without an ack function
- **THEN** the lobby is still created and `lobby:created` event is emitted on the socket

#### Scenario: Pending removal timer is cancelled
- **WHEN** a lobby removal timer exists for the generated lobby ID
- **THEN** the timer is cleared and removed from `lobbyRemovalTimers`

### Requirement: handleJoinLobby adds a participant to an existing lobby
The system SHALL allow new participants to join a lobby and existing participants to rejoin, with CAPTCHA verification for new joins only.

#### Scenario: New participant joins successfully
- **WHEN** handleJoinLobby is called with a valid lobbyId, name "Bob", no existingClientId, and valid captcha
- **THEN** a new participant is added with `isAdmin: false`, the socket joins the room, the ack receives full lobby state, `lobby:participant-joined` is emitted to the room, `LOBBY_JOINED` event is emitted, and `saveLobby` is called

#### Scenario: Existing participant rejoins
- **WHEN** handleJoinLobby is called with a valid existingClientId that exists in the lobby
- **THEN** CAPTCHA is skipped, the participant's name is updated, no `lobby:participant-joined` event is emitted, and `saveLobby` is called

#### Scenario: Lobby not found
- **WHEN** handleJoinLobby is called with a lobbyId that does not exist
- **THEN** the ack receives `{ ok: false, error: "Lobby not found" }`

#### Scenario: CAPTCHA fails for new participant
- **WHEN** handleJoinLobby is called for a new participant and CAPTCHA verification fails
- **THEN** the ack receives `{ ok: false, error: "Invalid CAPTCHA" }` and no participant is added

### Requirement: handleVote records a participant's vote
The system SHALL record a vote for a connected participant in a lobby and broadcast it.

#### Scenario: Successful vote
- **WHEN** handleVote is called with a valid lobbyId and card value by a connected participant
- **THEN** the participant's vote is updated, `lobby:voted` is emitted to the room with `{ lobbyId, clientId, card }`, the ack receives `{ ok: true }`, and `saveLobby` is called

#### Scenario: Vote with null card (clear vote)
- **WHEN** handleVote is called with `card: null`
- **THEN** the participant's vote is set to undefined

#### Scenario: Missing lobbyId
- **WHEN** handleVote is called without a lobbyId
- **THEN** the ack receives `{ ok: false, error: "Missing lobbyId" }`

#### Scenario: Lobby not found
- **WHEN** handleVote is called with a lobbyId that does not exist
- **THEN** the ack receives `{ ok: false, error: "Lobby not found" }`

#### Scenario: Socket not connected to lobby
- **WHEN** handleVote is called by a socket that has no connection mapping for the lobby
- **THEN** the ack receives `{ ok: false, error: "Not a participant in this lobby" }`

#### Scenario: Participant not found in lobby
- **WHEN** handleVote is called by a socket whose clientId is not in the lobby's participants
- **THEN** the ack receives `{ ok: false, error: "Not a participant in this lobby" }`

### Requirement: handleReveal reveals votes for host only
The system SHALL allow only the lobby host to reveal votes.

#### Scenario: Host reveals votes
- **WHEN** handleReveal is called by the lobby host
- **THEN** `lobby.isRevealed` is set to true, `lobby:revealed` is emitted to the room, the ack receives `{ ok: true }`, and `saveLobby` is called

#### Scenario: Non-host attempts reveal
- **WHEN** handleReveal is called by a participant who is not the host
- **THEN** the ack receives `{ ok: false, error: "Only the lobby owner can reveal votes" }`

#### Scenario: Already revealed
- **WHEN** handleReveal is called on a lobby where `isRevealed` is already true
- **THEN** the ack receives `{ ok: true }` and no event is emitted, no saveLobby called

#### Scenario: Missing lobbyId
- **WHEN** handleReveal is called without a lobbyId
- **THEN** the ack receives `{ ok: false, error: "Missing lobbyId" }`

#### Scenario: Lobby not found
- **WHEN** handleReveal is called with a non-existent lobbyId
- **THEN** the ack receives `{ ok: false, error: "Lobby not found" }`

### Requirement: handleReset clears votes for host only
The system SHALL allow only the lobby host to reset all votes and hide them.

#### Scenario: Host resets lobby
- **WHEN** handleReset is called by the lobby host
- **THEN** all participant votes are set to undefined, `lobby.isRevealed` is set to false, `lobby:reset` is emitted to the room, the ack receives `{ ok: true }`, and `saveLobby` is called

#### Scenario: Non-host attempts reset
- **WHEN** handleReset is called by a participant who is not the host
- **THEN** the ack receives `{ ok: false, error: "Only the lobby owner can reset the lobby" }`

#### Scenario: Missing lobbyId
- **WHEN** handleReset is called without a lobbyId
- **THEN** the ack receives `{ ok: false, error: "Missing lobbyId" }`

#### Scenario: Lobby not found
- **WHEN** handleReset is called with a non-existent lobbyId
- **THEN** the ack receives `{ ok: false, error: "Lobby not found" }`

### Requirement: handleSync returns current lobby state
The system SHALL return the current lobby state and optionally re-establish connection mappings.

#### Scenario: Successful sync
- **WHEN** handleSync is called with a valid lobbyId
- **THEN** the ack receives `{ ok: true, lobbyId, hostId, participants, isRevealed }` and the socket joins the room

#### Scenario: Sync with clientId re-establishes connection
- **WHEN** handleSync is called with a clientId that exists in the lobby
- **THEN** the connection mapping is updated to associate the socket with that clientId

#### Scenario: Missing lobbyId
- **WHEN** handleSync is called without a lobbyId
- **THEN** the ack receives `{ ok: false, error: "Missing lobbyId" }`

#### Scenario: Lobby not found
- **WHEN** handleSync is called with a non-existent lobbyId
- **THEN** the ack receives `{ ok: false, error: "Lobby not found" }`

### Requirement: handleExists checks lobby existence
The system SHALL report whether a lobby exists.

#### Scenario: Lobby exists
- **WHEN** handleExists is called with a lobbyId that exists
- **THEN** the ack receives `{ ok: true }`

#### Scenario: Lobby does not exist
- **WHEN** handleExists is called with a lobbyId that does not exist
- **THEN** the ack receives `{ ok: false }`

#### Scenario: Missing lobbyId
- **WHEN** handleExists is called without a lobbyId
- **THEN** the ack receives `{ ok: false }`

#### Scenario: No ack callback
- **WHEN** handleExists is called without an ack function
- **THEN** the function returns early without error

### Requirement: handleDisconnect cleans up connection state
The system SHALL remove connection mappings on disconnect and schedule lobby removal when no connections remain.

#### Scenario: Disconnect with other connections remaining
- **WHEN** a socket disconnects but other sockets are still connected to the same lobby
- **THEN** the socket's connection is removed but the lobby is not scheduled for removal

#### Scenario: Disconnect with no remaining connections
- **WHEN** the last socket in a lobby disconnects
- **THEN** a 5-minute removal timer is scheduled that deletes the lobby from memory and Redis

#### Scenario: Disconnect replaces existing removal timer
- **WHEN** a removal timer already exists for the lobby and the last socket disconnects
- **THEN** the old timer is cleared and a new one is set

#### Scenario: Socket reconnects before timer fires
- **WHEN** a new connection is established for the lobby before the removal timer fires
- **THEN** the lobby is not removed when the timer fires (checks for returned connections)

#### Scenario: Disconnect with no connection mapping
- **WHEN** a socket disconnects that has no entry in the connections map
- **THEN** the function returns without error
