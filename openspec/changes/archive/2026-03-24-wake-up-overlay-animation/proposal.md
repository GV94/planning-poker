## Why

The current wake-up overlay uses a static breathing circle (simple scale pulse) and a broken shimmer progress bar as its waiting animation. The success transition is abrupt — the animation vanishes and a generic green checkmark pops in. These feel unpolished and don't match the quality of the rest of the app. The animation should feel alive, organic, and satisfying to watch during cold start waits.

## What Changes

- Replace the static breathing circle with a **breathing metaball animation**: 5 goo-filtered `<div>` circles that orbit, merge, and separate following a 12-second deep breathing rhythm (inhale 4s, hold 1s, exhale 6s, hold 1s)
- Remove the broken shimmer progress bar entirely
- Replace the abrupt checkmark success screen with an **"expand & dissolve" transition**: balls grow, spread outward, shift color from blue to emerald, fade diffuse while success text fades in, then the whole overlay fades out
- Add `prefers-reduced-motion` support: static circle fallback for waiting, simple fade for transition
- Clean up unused `breathing` and `shimmer` Tailwind keyframes

## Capabilities

### New Capabilities

_(none — all changes modify the existing wake-up-overlay capability)_

### Modified Capabilities

- `wake-up-overlay`: Breathing animation requirement changes from simple scale pulse to metaball animation. Success transition requirement changes from checkmark fade-in to expand & dissolve. New requirement for reduced motion accessibility. Progress bar requirement removed.

## Impact

- `apps/web/src/components/ui/wake-up-overlay.tsx` — full rewrite of the component
- `apps/web/tailwind.config.mts` — remove `breathing` and `shimmer` keyframes/animations
- No changes to props interface, server-status context, or consuming pages
- No new dependencies
