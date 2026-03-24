## MODIFIED Requirements

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

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Progress shimmer bar
**Reason**: The shimmer progress bar was broken (not animating) and is unnecessary with the metaball animation providing sufficient visual activity.
**Migration**: No migration needed — the progress bar was purely decorative with no functional purpose.
