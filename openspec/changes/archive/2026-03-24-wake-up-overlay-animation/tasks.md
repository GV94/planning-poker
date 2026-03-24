## 1. Tailwind Cleanup

- [x] 1.1 Remove `breathing` and `shimmer` keyframes and animations from `apps/web/tailwind.config.mts`, keeping `fade-in` and `fade-out`
- [x] 1.2 Verify no other files reference `animate-breathing` or `animate-shimmer` (only `wake-up-overlay.tsx` should)
- [x] 1.3 Commit tailwind changes

## 2. Metaball Waiting Animation

- [x] 2.1 Rewrite `apps/web/src/components/ui/wake-up-overlay.tsx`: replace the breathing circle and shimmer bar with 5 metaball `<div>`s inside a goo-filtered container, driven by a `requestAnimationFrame` loop with the 12s breathing cycle (inhale 4s, hold 1s, exhale 6s, hold 1s)
- [x] 2.2 Add inline SVG `<filter id="goo">` with `feGaussianBlur` (stdDeviation 18) and `feColorMatrix` (contrast 40/-16)
- [x] 2.3 Add `prefers-reduced-motion` check — show a static circle instead of metaballs when active
- [x] 2.4 Retain rotating messages and expandable explainer (unchanged behavior)
- [ ] 2.5 Visually verify the metaball animation in both blocking and overlay modes
- [x] 2.6 Commit metaball animation changes

## 3. Expand & Dissolve Transition

- [x] 3.1 Replace the success state logic: introduce a `phase` ref (`waiting` | `transitioning` | `done`) instead of `showSuccess`/`fadingOut` booleans
- [x] 3.2 Implement the expand phase in the rAF loop: balls grow (sizeFactor up to 2.2x), spread outward, scene opacity fades, color interpolates from blue/indigo to emerald
- [x] 3.3 Implement text fade-in at 60% of the expand duration, showing "Everything is set up for you, happy planning!"
- [x] 3.4 Implement final overlay fade-out (~1s) after the expand completes, firing `onFadeOutComplete` when done
- [x] 3.5 Add reduced-motion fallback for the transition: simple fade-out with immediate text display
- [ ] 3.6 Visually verify the full waiting → transition → fade-out flow in both blocking and overlay modes
- [ ] 3.7 Verify reduced-motion behavior via browser DevTools emulation
- [x] 3.8 Commit transition changes
