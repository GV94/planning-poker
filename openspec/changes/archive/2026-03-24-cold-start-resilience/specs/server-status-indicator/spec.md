## ADDED Requirements

### Requirement: Persistent status indicator in top bar
The system SHALL display a small status indicator in the top area of the screen that is visible on all pages.

#### Scenario: Server is online
- **WHEN** the server status is `online`
- **THEN** the indicator SHALL display a green dot with a slow pulse animation
- **AND** it SHALL display the text "Server online"

#### Scenario: Server is sleeping or waking
- **WHEN** the server status is `checking` or `waking`
- **THEN** the indicator SHALL display an amber/orange dot with an animated pulse
- **AND** it SHALL display appropriate text such as "Server sleeping..." or "Waking up..."

#### Scenario: Server is disconnected
- **WHEN** the server status is `disconnected`
- **THEN** the indicator SHALL display an amber/orange dot with an animated pulse
- **AND** it SHALL display the text "Reconnecting..."

### Requirement: Non-intrusive design
The indicator SHALL be subtle and not interfere with primary page content.

#### Scenario: Visual weight
- **WHEN** the indicator is displayed
- **THEN** it SHALL use small text and a small dot
- **AND** it SHALL be positioned in the top area of the screen without overlapping primary content
