# Wake-Up Overlay Animation Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static breathing circle with a breathing metaball animation, and replace the abrupt checkmark success screen with a smooth "expand & dissolve" transition.

**Architecture:** Rewrite `wake-up-overlay.tsx` to render 5 metaball `<div>`s inside a goo-filtered container, driven by a `requestAnimationFrame` loop with a 12s breathing cycle. On server-ready, the loop transitions to an "expand & dissolve" phase that grows and fades the balls while shifting color to emerald. Clean up unused Tailwind keyframes.

**Tech Stack:** React, CSS transforms, SVG filters (`feGaussianBlur` + `feColorMatrix`), `requestAnimationFrame`

**Spec:** `docs/superpowers/specs/2026-03-24-wake-up-overlay-animation-design.md`

---

### Task 1: Remove unused Tailwind keyframes

**Files:**
- Modify: `apps/web/tailwind.config.mts:51-74`

- [ ] **Step 1: Remove `breathing` and `shimmer` keyframes and animations**

In `tailwind.config.mts`, remove the `breathing` and `shimmer` entries from both `keyframes` and `animation`. Keep `fade-in` and `fade-out`. The result should be:

```typescript
keyframes: {
  'fade-in': {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  'fade-out': {
    '0%': { opacity: '1' },
    '100%': { opacity: '0' },
  },
},
animation: {
  'fade-in': 'fade-in 0.8s ease-out forwards',
  'fade-out': 'fade-out 0.8s ease-out forwards',
},
```

- [ ] **Step 2: Verify no other files reference the removed classes**

Run: `grep -r "animate-breathing\|animate-shimmer" apps/web/src/`
Expected: Only `wake-up-overlay.tsx` (which we'll rewrite in the next task).

- [ ] **Step 3: Commit**

```bash
git add apps/web/tailwind.config.mts
git commit -m "chore: remove unused breathing and shimmer Tailwind keyframes"
```

---

### Task 2: Rewrite WakeUpOverlay — metaball DOM structure and goo filter

**Files:**
- Modify: `apps/web/src/components/ui/wake-up-overlay.tsx`

This task replaces the entire component. We do it in two commits: first the waiting state (metaball animation), then the transition.

- [ ] **Step 1: Replace the component with the metaball waiting state**

Rewrite `wake-up-overlay.tsx` with the full content below. This version implements the breathing metaball animation and retains the rotating messages and explainer. The transition logic is stubbed (it still uses the old fade approach) — we'll replace it in Task 3.

```tsx
import { useState, useEffect, useRef, useCallback } from 'react';

const LOADING_MESSAGES = [
  'Contacting the mothership...',
  'Waking the bear...',
  'Booting robots...',
  'Brewing coffee...',
  'Stretching neurons...',
  'Dusting off the servers...',
  'Convincing hamsters to run...',
  'Warming up the engines...',
  'Polishing the bits...',
];

const MESSAGE_INTERVAL_MS = 3500;

// Breathing cycle timing (ms)
const INHALE = 4000;
const HOLD_IN = 1000;
const EXHALE = 6000;
const HOLD_OUT = 1000;
const CYCLE = INHALE + HOLD_IN + EXHALE + HOLD_OUT;

// Ball definitions
const BALLS = [
  { size: 60, orbitX: 42, orbitY: 30, speedA: 0.00038, speedB: 0.00048, phase: 0 },
  { size: 48, orbitX: 35, orbitY: 38, speedA: 0.00052, speedB: 0.00038, phase: 1.3 },
  { size: 42, orbitX: 38, orbitY: 32, speedA: 0.00032, speedB: 0.00055, phase: 2.6 },
  { size: 36, orbitX: 30, orbitY: 36, speedA: 0.00058, speedB: 0.00042, phase: 3.9 },
  { size: 30, orbitX: 34, orbitY: 28, speedA: 0.00042, speedB: 0.00035, phase: 5.2 },
];

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function breathFactor(t: number): number {
  const pos = t % CYCLE;
  if (pos < INHALE) return easeInOutSine(pos / INHALE);
  if (pos < INHALE + HOLD_IN) return 1;
  if (pos < INHALE + HOLD_IN + EXHALE)
    return 1 - easeInOutSine((pos - INHALE - HOLD_IN) / EXHALE);
  return 0;
}

interface WakeUpOverlayProps {
  mode: 'blocking' | 'overlay';
  visible: boolean;
  onFadeOutComplete?: () => void;
}

export function WakeUpOverlay({
  mode,
  visible,
  onFadeOutComplete,
}: WakeUpOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(
    () => Math.floor(Math.random() * LOADING_MESSAGES.length),
  );
  const [isFadingMessage, setIsFadingMessage] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const wasVisible = useRef(visible);
  const ballRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number>(0);
  const prefersReducedMotion = useRef(false);

  // Check reduced motion preference
  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
  }, []);

  // Metaball animation loop
  useEffect(() => {
    if (!visible || showSuccess || prefersReducedMotion.current) return;

    function tick(t: number) {
      const breath = breathFactor(t);
      const spreadFactor = 0.15 + breath * 0.85;
      const sizeFactor = 0.7 + breath * 0.3;

      for (let i = 0; i < BALLS.length; i++) {
        const el = ballRefs.current[i];
        if (!el) continue;
        const b = BALLS[i];
        const s = b.size * sizeFactor;
        const ox =
          Math.sin(t * b.speedA + b.phase) * b.orbitX * spreadFactor +
          Math.cos(t * b.speedA * 0.6 + b.phase * 1.4) *
            b.orbitX *
            0.35 *
            spreadFactor;
        const oy =
          Math.cos(t * b.speedB + b.phase) * b.orbitY * spreadFactor +
          Math.sin(t * b.speedB * 0.7 + b.phase * 0.9) *
            b.orbitY *
            0.35 *
            spreadFactor;
        el.style.width = `${s}px`;
        el.style.height = `${s}px`;
        el.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, showSuccess]);

  // Rotate messages
  useEffect(() => {
    if (!visible || showSuccess) return;

    const interval = setInterval(() => {
      setIsFadingMessage(true);
      setTimeout(() => {
        setMessageIndex(
          (prev) => (prev + 1) % LOADING_MESSAGES.length,
        );
        setIsFadingMessage(false);
      }, 300);
    }, MESSAGE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [visible, showSuccess]);

  // Detect transition from visible to not visible (server came online)
  useEffect(() => {
    if (wasVisible.current && !visible) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setFadingOut(true);
        const fadeTimer = setTimeout(() => {
          setShowSuccess(false);
          setFadingOut(false);
          onFadeOutComplete?.();
        }, 800);
        return () => clearTimeout(fadeTimer);
      }, 1500);
      return () => clearTimeout(timer);
    }
    wasVisible.current = visible;
  }, [visible, onFadeOutComplete]);

  const setBallRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      ballRefs.current[index] = el;
    },
    [],
  );

  if (!visible && !showSuccess && !fadingOut) return null;

  const baseClasses =
    mode === 'blocking'
      ? 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950'
      : 'absolute inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm';

  return (
    <div
      className={`${baseClasses} ${fadingOut ? 'animate-fade-out' : 'animate-fade-in'}`}
    >
      {/* SVG goo filter */}
      <svg
        style={{ position: 'absolute', width: 0, height: 0 }}
        aria-hidden="true"
      >
        <defs>
          <filter id="goo">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="18"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 40 -16"
            />
          </filter>
        </defs>
      </svg>

      <div className="flex flex-col items-center gap-6 px-4 text-center">
        {showSuccess ? (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <p className="text-lg font-medium text-slate-100">
              Everything is set up for you, happy planning!
            </p>
          </div>
        ) : (
          <>
            {/* Metaball container */}
            {prefersReducedMotion.current ? (
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-sky-400/50 to-indigo-400/40" />
            ) : (
              <div
                className="relative"
                style={{ width: 200, height: 200, filter: 'url(#goo)' }}
              >
                {BALLS.map((b, i) => (
                  <div
                    key={i}
                    ref={setBallRef(i)}
                    className="absolute rounded-full"
                    style={{
                      width: b.size,
                      height: b.size,
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      background:
                        'linear-gradient(135deg, #38bdf8, #818cf8)',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Rotating message */}
            <p
              className={`h-6 text-sm text-slate-300 transition-opacity duration-300 ${
                isFadingMessage ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {LOADING_MESSAGES[messageIndex]}
            </p>

            {/* Expandable explainer */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setExplainerOpen((o) => !o)}
                className="text-xs text-slate-500 underline decoration-slate-700 underline-offset-2 transition hover:text-slate-400"
              >
                Why am I seeing this?
              </button>
              {explainerOpen && (
                <div className="mt-3 max-w-sm animate-fade-in rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-left text-xs text-slate-400">
                  <p>
                    Plokr runs on free infrastructure that scales to zero
                    when nobody is using it. When you're the first visitor
                    in a while, the server needs a moment to wake up.
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-slate-300">
                    <span className="text-pink-400" aria-hidden="true">
                      &#9829;
                    </span>
                    Want faster starts? Consider sponsoring the project to
                    help keep the servers warm.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify visually**

Run: `npx nx serve web`

Open the app. If the server is already online, temporarily set `WAKING_THRESHOLD_MS` to `0` in `server-status.tsx` to force the overlay to show, or disconnect the backend. Verify:
- 5 blobs breathing in and out with gooey merge effect
- Rotating messages appear below
- "Why am I seeing this?" expander works
- No shimmer progress bar

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/wake-up-overlay.tsx
git commit -m "feat(web): replace breathing circle with metaball animation"
```

---

### Task 3: Implement expand & dissolve transition

**Files:**
- Modify: `apps/web/src/components/ui/wake-up-overlay.tsx`

Replace the stubbed transition logic with the expand & dissolve animation. This replaces the success state rendering and the `visible` transition effect.

- [ ] **Step 1: Replace the transition logic**

Replace the entire component in `wake-up-overlay.tsx` with the final version below. Key changes from Task 2:
- New state: `phase` (`'waiting' | 'transitioning' | 'done'`) replaces `showSuccess` / `fadingOut`
- The rAF loop handles both breathing and the expand & dissolve phases
- Transition phase: balls grow, spread, fade, shift to emerald; text fades in; then whole overlay fades out
- `onFadeOutComplete` fires after the transition completes

```tsx
import { useState, useEffect, useRef, useCallback } from 'react';

const LOADING_MESSAGES = [
  'Contacting the mothership...',
  'Waking the bear...',
  'Booting robots...',
  'Brewing coffee...',
  'Stretching neurons...',
  'Dusting off the servers...',
  'Convincing hamsters to run...',
  'Warming up the engines...',
  'Polishing the bits...',
];

const MESSAGE_INTERVAL_MS = 3500;

// Breathing cycle (ms)
const INHALE = 4000;
const HOLD_IN = 1000;
const EXHALE = 6000;
const HOLD_OUT = 1000;
const CYCLE = INHALE + HOLD_IN + EXHALE + HOLD_OUT;

// Transition timing (ms)
const EXPAND_DURATION = 2000;
const TEXT_APPEAR_AT = EXPAND_DURATION * 0.6; // text starts fading in at 60%
const TEXT_FADE_IN = 600;
const FADE_OUT_DELAY = EXPAND_DURATION + 500; // pause after expand before fading
const FADE_OUT_DURATION = 1000;
const TOTAL_TRANSITION = FADE_OUT_DELAY + FADE_OUT_DURATION;

// Ball definitions
const BALLS = [
  { size: 60, orbitX: 42, orbitY: 30, speedA: 0.00038, speedB: 0.00048, phase: 0 },
  { size: 48, orbitX: 35, orbitY: 38, speedA: 0.00052, speedB: 0.00038, phase: 1.3 },
  { size: 42, orbitX: 38, orbitY: 32, speedA: 0.00032, speedB: 0.00055, phase: 2.6 },
  { size: 36, orbitX: 30, orbitY: 36, speedA: 0.00058, speedB: 0.00042, phase: 3.9 },
  { size: 30, orbitX: 34, orbitY: 28, speedA: 0.00042, speedB: 0.00035, phase: 5.2 },
];

// Color interpolation helpers
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(
  from: [number, number, number],
  to: [number, number, number],
  t: number,
): string {
  return `rgb(${lerp(from[0], to[0], t)}, ${lerp(from[1], to[1], t)}, ${lerp(from[2], to[2], t)})`;
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function breathFactor(t: number): number {
  const pos = t % CYCLE;
  if (pos < INHALE) return easeInOutSine(pos / INHALE);
  if (pos < INHALE + HOLD_IN) return 1;
  if (pos < INHALE + HOLD_IN + EXHALE)
    return 1 - easeInOutSine((pos - INHALE - HOLD_IN) / EXHALE);
  return 0;
}

type OverlayPhase = 'waiting' | 'transitioning' | 'done';

interface WakeUpOverlayProps {
  mode: 'blocking' | 'overlay';
  visible: boolean;
  onFadeOutComplete?: () => void;
}

export function WakeUpOverlay({
  mode,
  visible,
  onFadeOutComplete,
}: WakeUpOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(
    () => Math.floor(Math.random() * LOADING_MESSAGES.length),
  );
  const [isFadingMessage, setIsFadingMessage] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const phaseRef = useRef<OverlayPhase>('waiting');
  const [phase, setPhase] = useState<OverlayPhase>('waiting');
  const wasVisible = useRef(visible);
  const transitionStart = useRef(0);
  const ballRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>(0);
  const prefersReducedMotion = useRef(false);

  // Check reduced motion preference
  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
  }, []);

  // Animation loop — handles both breathing and transition
  useEffect(() => {
    if (prefersReducedMotion.current) return;
    if (phaseRef.current === 'done') return;

    function tick(t: number) {
      const currentPhase = phaseRef.current;

      if (currentPhase === 'waiting') {
        const breath = breathFactor(t);
        const spreadFactor = 0.15 + breath * 0.85;
        const sizeFactor = 0.7 + breath * 0.3;

        for (let i = 0; i < BALLS.length; i++) {
          const el = ballRefs.current[i];
          if (!el) continue;
          const b = BALLS[i];
          const s = b.size * sizeFactor;
          const ox =
            Math.sin(t * b.speedA + b.phase) * b.orbitX * spreadFactor +
            Math.cos(t * b.speedA * 0.6 + b.phase * 1.4) *
              b.orbitX * 0.35 * spreadFactor;
          const oy =
            Math.cos(t * b.speedB + b.phase) * b.orbitY * spreadFactor +
            Math.sin(t * b.speedB * 0.7 + b.phase * 0.9) *
              b.orbitY * 0.35 * spreadFactor;
          el.style.width = `${s}px`;
          el.style.height = `${s}px`;
          el.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
        }
      } else if (currentPhase === 'transitioning') {
        const elapsed = t - transitionStart.current;

        // Expand phase: balls grow, spread, fade, shift color
        const expandP = easeInOutSine(
          Math.min(elapsed / EXPAND_DURATION, 1),
        );

        for (let i = 0; i < BALLS.length; i++) {
          const el = ballRefs.current[i];
          if (!el) continue;
          const b = BALLS[i];
          const sizeFactor = (0.7 + expandP * 1.5);
          const s = b.size * sizeFactor;
          // Spread outward during expand
          const spreadFactor = 0.15 + expandP * 0.85;
          const ox =
            Math.sin(t * b.speedA + b.phase) * b.orbitX * spreadFactor +
            Math.cos(t * b.speedA * 0.6 + b.phase * 1.4) *
              b.orbitX * 0.35 * spreadFactor;
          const oy =
            Math.cos(t * b.speedB + b.phase) * b.orbitY * spreadFactor +
            Math.sin(t * b.speedB * 0.7 + b.phase * 0.9) *
              b.orbitY * 0.35 * spreadFactor;
          el.style.width = `${s}px`;
          el.style.height = `${s}px`;
          el.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
          // Color shift: blue/indigo → emerald
          const c1 = lerpColor([56, 189, 248], [16, 185, 129], expandP);
          const c2 = lerpColor([129, 140, 248], [52, 211, 153], expandP);
          el.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
        }

        // Scene opacity fades as balls expand
        if (sceneRef.current) {
          sceneRef.current.style.opacity = `${1 - expandP * 0.8}`;
        }

        // Text fade in
        if (textRef.current) {
          if (elapsed > TEXT_APPEAR_AT) {
            const textP = Math.min(
              (elapsed - TEXT_APPEAR_AT) / TEXT_FADE_IN,
              1,
            );
            textRef.current.style.opacity = `${textP}`;
          }
        }

        // Final fade out of entire overlay
        if (elapsed > FADE_OUT_DELAY && overlayRef.current) {
          const fadeP = (elapsed - FADE_OUT_DELAY) / FADE_OUT_DURATION;
          overlayRef.current.style.opacity = `${1 - Math.min(fadeP, 1)}`;

          if (fadeP >= 1) {
            phaseRef.current = 'done';
            setPhase('done');
            onFadeOutComplete?.();
            return; // stop the loop
          }
        }
      }

      if (phaseRef.current !== 'done') {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, onFadeOutComplete]);

  // Detect visible → not visible: start transition
  useEffect(() => {
    if (wasVisible.current && !visible) {
      if (prefersReducedMotion.current) {
        // Simple fade for reduced motion
        setPhase('transitioning');
        phaseRef.current = 'transitioning';
        setTimeout(() => {
          setPhase('done');
          phaseRef.current = 'done';
          onFadeOutComplete?.();
        }, 1500);
      } else {
        transitionStart.current = performance.now();
        phaseRef.current = 'transitioning';
        setPhase('transitioning');
      }
    }
    wasVisible.current = visible;
  }, [visible, onFadeOutComplete]);

  // Rotate messages
  useEffect(() => {
    if (!visible || phase !== 'waiting') return;

    const interval = setInterval(() => {
      setIsFadingMessage(true);
      setTimeout(() => {
        setMessageIndex(
          (prev) => (prev + 1) % LOADING_MESSAGES.length,
        );
        setIsFadingMessage(false);
      }, 300);
    }, MESSAGE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [visible, phase]);

  const setBallRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      ballRefs.current[index] = el;
    },
    [],
  );

  if (phase === 'done' && !visible) return null;

  const baseClasses =
    mode === 'blocking'
      ? 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950'
      : 'absolute inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm';

  const isReducedMotionTransition =
    prefersReducedMotion.current && phase === 'transitioning';

  return (
    <div
      ref={overlayRef}
      className={`${baseClasses} ${phase === 'waiting' ? 'animate-fade-in' : ''} ${isReducedMotionTransition ? 'animate-fade-out' : ''}`}
    >
      {/* SVG goo filter */}
      <svg
        style={{ position: 'absolute', width: 0, height: 0 }}
        aria-hidden="true"
      >
        <defs>
          <filter id="goo">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="18"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 40 -16"
            />
          </filter>
        </defs>
      </svg>

      <div className="flex flex-col items-center gap-6 px-4 text-center">
        {/* Metaball scene — visible during waiting and transition */}
        {phase !== 'done' && !prefersReducedMotion.current && (
          <div
            ref={sceneRef}
            className="relative"
            style={{ width: 200, height: 200, filter: 'url(#goo)' }}
          >
            {BALLS.map((b, i) => (
              <div
                key={i}
                ref={setBallRef(i)}
                className="absolute rounded-full"
                style={{
                  width: b.size,
                  height: b.size,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  background:
                    'linear-gradient(135deg, #38bdf8, #818cf8)',
                }}
              />
            ))}
          </div>
        )}

        {/* Reduced motion: static circle */}
        {phase === 'waiting' && prefersReducedMotion.current && (
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-sky-400/50 to-indigo-400/40" />
        )}

        {/* Success text — positioned over the metaball scene during transition */}
        {phase === 'transitioning' && (
          <p
            ref={textRef}
            className="text-lg font-medium text-slate-100"
            style={{ opacity: prefersReducedMotion.current ? 1 : 0 }}
          >
            Everything is set up for you, happy planning!
          </p>
        )}

        {/* Rotating message — only during waiting */}
        {phase === 'waiting' && (
          <>
            <p
              className={`h-6 text-sm text-slate-300 transition-opacity duration-300 ${
                isFadingMessage ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {LOADING_MESSAGES[messageIndex]}
            </p>

            {/* Expandable explainer */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setExplainerOpen((o) => !o)}
                className="text-xs text-slate-500 underline decoration-slate-700 underline-offset-2 transition hover:text-slate-400"
              >
                Why am I seeing this?
              </button>
              {explainerOpen && (
                <div className="mt-3 max-w-sm animate-fade-in rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-left text-xs text-slate-400">
                  <p>
                    Plokr runs on free infrastructure that scales to zero
                    when nobody is using it. When you're the first visitor
                    in a while, the server needs a moment to wake up.
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-slate-300">
                    <span className="text-pink-400" aria-hidden="true">
                      &#9829;
                    </span>
                    Want faster starts? Consider sponsoring the project to
                    help keep the servers warm.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the transition visually**

Run: `npx nx serve web`

Test the full flow:
1. Stop the backend server so the overlay appears with the breathing metaball
2. Start the backend server — verify the expand & dissolve transition fires:
   - Balls grow and spread outward, becoming diffuse
   - Color shifts from blue/indigo to emerald
   - "Everything is set up for you, happy planning!" fades in
   - Whole overlay fades out smoothly
3. Verify the overlay also works in the lobby disconnect/reconnect flow

- [ ] **Step 3: Test reduced motion**

In browser DevTools, toggle `prefers-reduced-motion: reduce` (Chrome: Rendering tab → Emulate CSS media). Verify:
- Waiting state shows a static circle instead of metaballs
- Transition is a simple fade out with text

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/wake-up-overlay.tsx
git commit -m "feat(web): add expand & dissolve transition to wake-up overlay"
```
