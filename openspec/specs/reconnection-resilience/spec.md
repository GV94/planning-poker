## ADDED Requirements

### Requirement: Lobby sync on socket reconnect
The system SHALL emit a `lobby:sync` event with the stored `lobbyId` and `clientId` whenever the Socket.IO connection is re-established after a disconnect.

#### Scenario: Successful reconnection and sync
- **WHEN** the Socket.IO connection reconnects after a disconnect
- **AND** the user was in a lobby
- **THEN** the system SHALL emit `lobby:sync` with the stored `lobbyId` and `clientId`
- **AND** on success, the lobby state SHALL be restored from the server response

#### Scenario: Lobby no longer exists after reconnect
- **WHEN** the Socket.IO connection reconnects and `lobby:sync` returns a failure
- **THEN** the system SHALL display a message indicating the lobby has ended
- **AND** it SHALL provide a link back to the landing page
- **AND** the stored session SHALL be cleared

### Requirement: Disabled controls during disconnect
The system SHALL disable all interactive lobby controls while the socket is disconnected.

#### Scenario: Vote button during disconnect
- **WHEN** the server status is `disconnected`
- **THEN** all vote card buttons SHALL be disabled
- **AND** the reveal and reset buttons SHALL be disabled

#### Scenario: Controls re-enabled after reconnect
- **WHEN** the server status returns to `online` after a disconnect
- **THEN** all lobby controls SHALL be re-enabled

### Requirement: Landing page buttons respect server status
The create lobby and join lobby buttons SHALL be disabled when the server is not online.

#### Scenario: Buttons disabled while server unavailable
- **WHEN** the server status is `checking`, `waking`, or `disconnected`
- **THEN** the "Create lobby" button SHALL be disabled
- **AND** the "Join lobby" button SHALL be disabled

#### Scenario: Buttons enabled when server is online
- **WHEN** the server status transitions to `online`
- **THEN** both buttons SHALL become enabled
