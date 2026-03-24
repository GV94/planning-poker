## ADDED Requirements

### Requirement: Breathing animation
The overlay SHALL display a slow, rhythmic breathing animation as its primary visual element. The animation MUST have a calming aesthetic with a period of approximately 4 seconds.

#### Scenario: Animation rendering
- **WHEN** the overlay is visible
- **THEN** it SHALL display a breathing animation using scale and opacity cycling
- **AND** the animation SHALL use the app's existing slate/sky color palette

### Requirement: Rotating loading messages
The overlay SHALL cycle through fun loading messages with a crossfade transition.

#### Scenario: Message rotation
- **WHEN** the overlay is visible and the server is waking
- **THEN** it SHALL display one message at a time from a predefined list including messages like "Contacting the mothership...", "Waking the bear...", "Booting robots...", "Brewing coffee...", "Stretching neurons...", "Dusting off the servers...", "Convincing hamsters to run..."
- **AND** messages SHALL crossfade every 3-4 seconds

### Requirement: Expandable explainer
The overlay SHALL include a "Why am I seeing this?" text button that expands to show an explanation.

#### Scenario: Expanding the explainer
- **WHEN** the user clicks "Why am I seeing this?"
- **THEN** the overlay SHALL expand to show text explaining that Plokr runs on free infrastructure and scales to zero when nobody is using it
- **AND** it SHALL include a sponsorship prompt with a heart icon

#### Scenario: Collapsing the explainer
- **WHEN** the user clicks the explainer toggle again while expanded
- **THEN** the explainer content SHALL collapse and hide

### Requirement: Success transition
The overlay SHALL show a success message before fading out when the server becomes available.

#### Scenario: Server comes online
- **WHEN** the server status transitions to `online` while the overlay is visible
- **THEN** the overlay SHALL display "Everything is set up for you, happy planning!" with a checkmark
- **AND** after a brief pause, the overlay SHALL fade out smoothly

### Requirement: Blocking mode on landing page
The overlay SHALL appear in full-screen blocking mode on the landing page when the server is not online.

#### Scenario: Landing page with sleeping server
- **WHEN** the user loads the landing page and the server status is `checking` or `waking`
- **THEN** the overlay SHALL cover the landing page content
- **AND** all lobby creation and join buttons SHALL be disabled

#### Scenario: Server becomes available on landing page
- **WHEN** the server status transitions to `online` on the landing page
- **THEN** the overlay SHALL show the success message and fade out
- **AND** the create lobby and join lobby buttons SHALL become enabled

### Requirement: Overlay mode on lobby page
The overlay SHALL appear as a positioned overlay on the lobby page when the socket connection is lost.

#### Scenario: Socket disconnect in lobby
- **WHEN** the server status is `disconnected` while the user is on the lobby page
- **THEN** the overlay SHALL appear over the lobby content with a backdrop blur
- **AND** the lobby content SHALL remain visible but dimmed underneath

#### Scenario: Reconnection in lobby
- **WHEN** the server reconnects and lobby state is restored via sync
- **THEN** the overlay SHALL show the success message and fade out
- **AND** the lobby SHALL display the restored state
