## Context

The wake-up overlay (`apps/web/src/components/ui/wake-up-overlay.tsx`) displays while the backend server cold-starts on free infrastructure. Currently it uses a single CSS-animated breathing circle (scale pulse) and a broken shimmer progress bar. The success state is a green checkmark that pops in abruptly. The component supports two modes: blocking (landing page) and overlay (lobby disconnect).

The server status context (`apps/web/src/contexts/server-status.tsx`) drives the overlay via a `visible` prop. This context and the consuming pages remain unchanged.

## Goals / Non-Goals

**Goals:**
- Replace the static animation with a breathing metaball effect that feels alive and organic
- Create a smooth, continuous transition from waiting to success that flows from the animation itself
- Support `prefers-reduced-motion` with appropriate fallbacks
- Remove dead code (unused Tailwind keyframes)

**Non-Goals:**
- Changing the server status detection logic or health check behavior
- Changing the component's props interface or how consuming pages use it
- Adding new dependencies or animation libraries
- Changing the overlay's text content, explainer, or message rotation logic

## Decisions

### 1. SVG goo filter for metaball merge effect

Use an SVG `<filter>` with `feGaussianBlur` (stdDeviation 18) + `feColorMatrix` (contrast 40/-16) applied to a container div. The filter output is used directly (no `feComposite` back onto source) to fully dissolve individual ball edges when they overlap.

**Alternatives considered:**
- Canvas-based implicit surface rendering — mathematically correct but significantly more complex, performed poorly in prototyping
- CSS `border-radius` blob tricks — can't achieve the merge/separation effect between multiple shapes
- WebGL — overkill for 5 circles, adds complexity

**Rationale:** The SVG filter approach is zero-dependency, GPU-composited, and produces the exact visual effect needed with minimal code. It's a well-established technique for metaball effects on the web.

### 2. requestAnimationFrame loop with direct DOM manipulation

Drive all ball positions via a single `requestAnimationFrame` loop that writes directly to `el.style.transform` and `el.style.width/height`. The same loop handles both the breathing phase and the expand & dissolve transition.

**Alternatives considered:**
- CSS keyframe animations — can't achieve the complex breathing cycle timing (4s inhale, 1s hold, 6s exhale, 1s hold) with the organic multi-ball orbit paths
- React state-driven re-renders — unnecessary overhead for 60fps animation; direct DOM manipulation is the standard pattern for rAF animation in React

**Rationale:** A single rAF loop is the simplest way to coordinate 5 balls with shared breathing state and transition seamlessly between phases without interruption.

### 3. Phase-based state machine for transition

Use a `phase` ref (`'waiting' | 'transitioning' | 'done'`) to control the rAF loop behavior. The transition is triggered by detecting `visible` going from `true` to `false`. The `performance.now()` timestamp at transition start drives all timing relative to that point.

**Rationale:** This avoids setTimeout chains and keeps the transition frame-accurate. The rAF loop naturally handles cleanup by stopping when phase reaches `'done'`.

## Risks / Trade-offs

- **SVG filter performance on low-end mobile** → The goo filter with stdDeviation 18 is GPU-composited on all modern browsers. On very old mobile GPUs it could cause jank. Mitigated by the `prefers-reduced-motion` fallback which skips the filter entirely.
- **Multiple overlays with same filter ID** → If two `WakeUpOverlay` instances mount simultaneously (shouldn't happen by design), the `id="goo"` SVG filter could conflict. Acceptable risk given the component's usage pattern.
- **Transition timing assumes rAF continuity** → If the browser throttles rAF (background tab), the transition will stretch. This is acceptable — the user isn't watching a background tab.
