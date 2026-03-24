# Wake-Up Overlay Animation Redesign

## Summary

Replace the static breathing circle and broken shimmer progress bar in the wake-up overlay with a breathing metaball animation, and replace the abrupt checkmark success screen with a smooth "expand & dissolve" transition. Applies to both blocking mode (landing page cold start) and overlay mode (lobby disconnect/reconnect).

## Current State

- **Waiting animation:** A single `div` with `animate-breathing` (6s scale pulse 1→1.08, opacity 0.5→0.85), a shimmer progress bar (broken), and rotating humorous messages.
- **Success screen:** Green checkmark circle with "Everything is set up for you, happy planning!" — fades in instantly when server comes online, displays for 1.5s, fades out over 0.8s.
- **Transition:** Abrupt — breathing circle vanishes, success state pops in.
- **Files involved:**
  - `apps/web/src/components/ui/wake-up-overlay.tsx` — main component
  - `apps/web/tailwind.config.mts` — keyframe definitions
  - `apps/web/src/contexts/server-status.tsx` — state management (unchanged)
  - `apps/web/src/app/screens/landing-page.tsx` — blocking mode usage (unchanged)
  - `apps/web/src/app/screens/lobby-page.tsx` — overlay mode usage (unchanged)

## Design

### 1. Waiting Animation: Breathing Metaball

**Replaces:** Static breathing circle + shimmer progress bar.

**Structure:**
- A container `div` with an SVG `<filter>` applied via CSS `filter: url(#goo)`
- Inside: 5 absolutely-positioned `div` circles with `border-radius: 50%` and a `linear-gradient(135deg, #38bdf8, #818cf8)` (sky-400 to indigo-400)
- Each ball has its own size, orbit parameters, speed, and phase offset

**Ball definitions:**

| Ball | Size | Orbit X | Orbit Y | Speed A   | Speed B   | Phase |
|------|------|---------|---------|-----------|-----------|-------|
| 1    | 60px | 42      | 30      | 0.00038   | 0.00048   | 0     |
| 2    | 48px | 35      | 38      | 0.00052   | 0.00038   | 1.3   |
| 3    | 42px | 38      | 32      | 0.00032   | 0.00055   | 2.6   |
| 4    | 36px | 30      | 36      | 0.00058   | 0.00042   | 3.9   |
| 5    | 30px | 34      | 28      | 0.00042   | 0.00035   | 5.2   |

**Orbit formula (per ball):**
```
ox = sin(t * speedA + phase) * orbitX * spreadFactor
   + cos(t * speedA * 0.6 + phase * 1.4) * orbitX * 0.35 * spreadFactor

oy = cos(t * speedB + phase) * orbitY * spreadFactor
   + sin(t * speedB * 0.7 + phase * 0.9) * orbitY * 0.35 * spreadFactor
```

**Breathing cycle (12s total):**
- Inhale: 4s (ease-in-out-sine) — `spreadFactor` goes 0.15→1.0, `sizeFactor` goes 0.7→1.0
- Hold in: 1s
- Exhale: 6s (ease-in-out-sine) — reverse
- Hold out: 1s

```
breathFactor(t):
  pos = t % 12000
  if pos < 4000:       easeInOutSine(pos / 4000)           // inhale
  if pos < 5000:       1.0                                  // hold
  if pos < 11000:      1 - easeInOutSine((pos-5000)/6000)  // exhale
  else:                0.0                                  // hold

spreadFactor = 0.15 + breathFactor * 0.85
sizeFactor   = 0.7  + breathFactor * 0.3
```

**SVG goo filter:**
```html
<svg style="position:absolute;width:0;height:0">
  <filter id="goo">
    <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
    <feColorMatrix in="blur" mode="matrix"
      values="1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 40 -16" />
  </filter>
</svg>
```

The filter outputs the color matrix result directly (not composited back via `feComposite`), which fully dissolves individual ball edges when they merge.

**Animation driver:** `requestAnimationFrame` loop updating `transform` and `width`/`height` on each ball element.

**Retained elements:**
- Rotating humorous messages (same text, same 3.5s interval, same fade behavior)
- "Why am I seeing this?" expandable explainer (unchanged)

**Removed elements:**
- Shimmer progress bar (broken, unnecessary with the metaball providing visual activity)
- `breathing` and `shimmer` keyframes from `tailwind.config.mts`

### 2. Transition: Expand & Dissolve

**Replaces:** Abrupt swap to green checkmark → 1.5s display → 0.8s fade out.

**Trigger:** `visible` prop transitions from `true` to `false` (server comes online / socket reconnects).

**Phases:**

1. **Expand (~2s):**
   - Breathing stops — `breathFactor` is held at 0
   - Balls grow (`sizeFactor` increases by up to 1.5x) and spread outward (`spreadFactor` inverts, pushing balls out)
   - Scene container opacity reduces from 1 → 0.2 (balls become diffuse)
   - Ball gradient color interpolates from blue/indigo toward emerald:
     - Start: `rgb(56, 189, 248)` → `rgb(129, 140, 248)`
     - End: `rgb(16, 185, 129)` → `rgb(52, 211, 153)`
   - Subtle emerald background tint appears on overlay: `rgba(16, 185, 129, 0.08)`
   - All transitions use `easeInOutSine`

2. **Text appear (~60% through expand):**
   - "Everything is set up for you, happy planning!" fades in at center over 0.6s
   - Styled: `text-lg font-medium text-slate-100` (same as current)

3. **Fade out (~1s):**
   - Text and background tint fade to opacity 0
   - `onFadeOutComplete` callback fires, unmounting the overlay

**Total transition duration:** ~3.5s

### 3. Overlay Mode (Disconnect/Reconnect)

The same animation and transition apply in overlay mode. The only difference is the overlay background:
- **Blocking mode:** `fixed inset-0 z-50 bg-slate-950` (solid)
- **Overlay mode:** `absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-sm` (semi-transparent)

Everything else — metaball animation, breathing cycle, expand & dissolve transition, messages, explainer — is identical.

### 4. Accessibility

When `prefers-reduced-motion` is active:
- Replace the metaball animation with a single static circle (similar to current but without the pulse)
- Transition becomes a simple cross-fade: waiting state fades out, success text fades in, then overlay fades out
- No `requestAnimationFrame` loop runs

### 5. Tailwind Config Changes

**Remove from `tailwind.config.mts`:**
- `keyframes.breathing`
- `keyframes.shimmer`
- `animation.breathing`
- `animation.shimmer`

**Keep:**
- `keyframes['fade-in']`, `keyframes['fade-out']`
- `animation['fade-in']`, `animation['fade-out']`

(Used by the explainer panel and overlay entrance/exit)

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/components/ui/wake-up-overlay.tsx` | Rewrite: metaball DOM, goo filter SVG, rAF animation loop, expand & dissolve transition, reduced-motion fallback |
| `apps/web/tailwind.config.mts` | Remove `breathing` and `shimmer` keyframes/animations |

## Files Unchanged

- `apps/web/src/contexts/server-status.tsx` — state management stays the same
- `apps/web/src/app/screens/landing-page.tsx` — same props interface
- `apps/web/src/app/screens/lobby-page.tsx` — same props interface
