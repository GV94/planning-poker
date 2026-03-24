## ADDED Requirements

### Requirement: Breathing animation
The overlay SHALL display a breathing metaball animation as its primary visual element. The animation MUST consist of 5 circular elements rendered inside a container with an SVG goo filter that merges overlapping shapes. The balls SHALL follow independent orbital paths and breathe together on a 12-second cycle: inhale 4 seconds (ease-in-out-sine), hold 1 second, exhale 6 seconds (ease-in-out-sine), hold 1 second. On inhale the balls SHALL spread outward and grow; on exhale they SHALL contract inward and merge.

#### Scenario: Animation rendering
- **WHEN** the overlay is visible
- **THEN** it SHALL display 5 circular elements with a blue-to-indigo gradient (`#38bdf8` to `#818cf8`)
- **AND** the container SHALL apply an SVG goo filter (`feGaussianBlur` stdDeviation 18, `feColorMatrix` contrast 40/-16)
- **AND** the balls SHALL orbit with independent speeds and phases while breathing in sync

#### Scenario: Breathing cycle
- **WHEN** the animation is running
- **THEN** on inhale (4s) the balls SHALL spread outward (spreadFactor 0.15 → 1.0) and grow (sizeFactor 0.7 → 1.0)
- **AND** on hold-in (1s) the balls SHALL remain at maximum spread
- **AND** on exhale (6s) the balls SHALL contract inward and merge together
- **AND** on hold-out (1s) the balls SHALL remain contracted

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
The overlay SHALL perform an "expand & dissolve" transition when the server becomes available, flowing continuously from the metaball animation.

#### Scenario: Server comes online
- **WHEN** the server status transitions to `online` while the overlay is visible
- **THEN** the balls SHALL stop breathing and begin growing and spreading outward over approximately 2 seconds
- **AND** the balls SHALL shift color from blue/indigo toward emerald (`#10b981` to `#34d399`)
- **AND** the metaball scene opacity SHALL reduce as balls expand
- **AND** at approximately 60% through the expand phase, the text "Everything is set up for you, happy planning!" SHALL fade in
- **AND** after the expand completes, the entire overlay SHALL fade out over approximately 1 second
- **AND** the `onFadeOutComplete` callback SHALL fire when the overlay is fully invisible

### Requirement: Reduced motion accessibility
The overlay SHALL respect the user's `prefers-reduced-motion` preference by providing appropriate fallbacks.

#### Scenario: Reduced motion waiting state
- **WHEN** the overlay is visible and `prefers-reduced-motion: reduce` is active
- **THEN** the overlay SHALL display a static circle instead of the metaball animation
- **AND** no `requestAnimationFrame` loop SHALL run

#### Scenario: Reduced motion transition
- **WHEN** the server comes online and `prefers-reduced-motion: reduce` is active
- **THEN** the overlay SHALL perform a simple fade-out transition
- **AND** the success text SHALL appear without animation

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
