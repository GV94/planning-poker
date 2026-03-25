import {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { Socket } from 'socket.io-client';

export type ServerStatus = 'checking' | 'waking' | 'online' | 'disconnected';

interface ServerStatusContextValue {
  status: ServerStatus;
  isReady: boolean;
  registerSocket: (socket: Socket) => void;
}

const ServerStatusContext = createContext<ServerStatusContextValue | null>(null);

/** Show wake-up overlay after this long on first visit. */
const INITIAL_WAKING_THRESHOLD_MS = 2000;
/** Show overlay after this long when already on the page. */
const RECONNECT_GRACE_MS = 10_000;
/** Consecutive health-check failures before showing overlay on reconnect. */
const RECONNECT_FAILURE_THRESHOLD = 2;
/** Per-request timeout for health checks. */
const HEALTH_TIMEOUT_MS = 60_000;
/** Per-request timeout for reconnect health checks (shorter for faster failure detection). */
const RECONNECT_HEALTH_TIMEOUT_MS = 5000;
/** Delay between health-check retries. */
const HEALTH_RETRY_DELAY_MS = 3000;

function getHealthUrl(): string {
  const base = import.meta.env.VITE_P2P_BASE as string | undefined;
  if (!base) throw new Error('VITE_P2P_BASE is required');
  return `${base.replace(/\/$/, '')}/health`;
}

interface EarlyHealth {
  start: number;
  ok?: boolean;
  health?: Promise<boolean>;
}

/** Access early health check state set by the inline script in root.tsx. */
function getEarlyHealth(): EarlyHealth | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { __plokr?: EarlyHealth };
  return w.__plokr ?? null;
}

export function ServerStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ServerStatus>('checking');
  const socketRef = useRef<Socket | null>(null);
  const hasGoneOnline = useRef(false);
  const reconnectCleanup = useRef<(() => void) | null>(null);

  // Sync initial status from early health check before first paint.
  // This avoids a flash between splash removal and overlay appearance.
  useLayoutEffect(() => {
    const early = getEarlyHealth();
    if (!early) return;
    if (early.ok) {
      hasGoneOnline.current = true;
      setStatus('online');
    } else if (Date.now() - early.start > INITIAL_WAKING_THRESHOLD_MS) {
      setStatus('waking');
    }
  }, []);

  // Remove splash screen once React has rendered the correct loading UI.
  // Runs after the useLayoutEffect above has set the right status.
  const splashRemoved = useRef(false);
  useEffect(() => {
    if (splashRemoved.current) return;
    if (status === 'checking') return; // Still determining — keep splash
    splashRemoved.current = true;

    const splash = document.getElementById('splash');
    if (!splash) return;

    if (status === 'online') {
      // Fade out splash
      splash.style.transition = 'opacity 0.3s ease-out';
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 300);
    } else {
      // WakeUpOverlay is now rendering underneath — remove splash immediately
      splash.remove();
    }
  }, [status]);

  // --- Initial health check (first visit) ---
  // Show wake-up overlay on first failure or after 2 s in flight.
  useEffect(() => {
    if (hasGoneOnline.current) return;

    let cancelled = false;
    let wakingTimer: ReturnType<typeof setTimeout> | undefined;

    const early = getEarlyHealth();
    const elapsed = early ? Date.now() - early.start : 0;
    const remaining = INITIAL_WAKING_THRESHOLD_MS - elapsed;

    if (remaining > 0) {
      wakingTimer = setTimeout(() => {
        if (!cancelled) setStatus('waking');
      }, remaining);
    }
    // If remaining <= 0, useLayoutEffect already set status to 'waking'

    async function checkHealth() {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        HEALTH_TIMEOUT_MS
      );

      try {
        const res = await fetch(getHealthUrl(), {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!cancelled && res.ok) {
          if (wakingTimer) clearTimeout(wakingTimer);
          hasGoneOnline.current = true;
          setStatus('online');
        } else if (!cancelled) {
          // First failure — show overlay immediately
          if (wakingTimer) clearTimeout(wakingTimer);
          setStatus('waking');
          setTimeout(() => {
            if (!cancelled) checkHealth();
          }, HEALTH_RETRY_DELAY_MS);
        }
      } catch {
        clearTimeout(timeout);
        if (!cancelled) {
          // First failure — show overlay immediately
          if (wakingTimer) clearTimeout(wakingTimer);
          setStatus('waking');
          setTimeout(() => {
            if (!cancelled) checkHealth();
          }, HEALTH_RETRY_DELAY_MS);
        }
      }
    }

    // Try the early health check promise first to avoid a redundant fetch
    if (early?.health) {
      const promise = early.health;
      early.health = undefined; // consume
      promise.then((ok) => {
        if (cancelled) return;
        if (ok) {
          if (wakingTimer) clearTimeout(wakingTimer);
          hasGoneOnline.current = true;
          setStatus('online');
        } else {
          // Early check failed — show overlay immediately and start retrying
          if (wakingTimer) clearTimeout(wakingTimer);
          setStatus('waking');
          checkHealth();
        }
      });
    } else {
      checkHealth();
    }

    return () => {
      cancelled = true;
      if (wakingTimer) clearTimeout(wakingTimer);
    };
  }, []);

  // Clean up reconnect check on unmount
  useEffect(() => {
    return () => {
      reconnectCleanup.current?.();
    };
  }, []);

  const registerSocket = useCallback((socket: Socket) => {
    // Clean up previous listeners if a new socket is registered
    if (socketRef.current) {
      socketRef.current.off('disconnect');
      socketRef.current.off('connect');
    }

    socketRef.current = socket;

    socket.on('disconnect', () => {
      // Don't show overlay immediately — give it a grace period.
      // Show overlay only after 2 consecutive health-check failures or 10 s.
      reconnectCleanup.current?.();

      let cancelled = false;
      let failures = 0;

      const graceTimer = setTimeout(() => {
        if (!cancelled) {
          cancelled = true;
          setStatus('disconnected');
        }
      }, RECONNECT_GRACE_MS);

      async function checkHealth() {
        if (cancelled) return;

        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          RECONNECT_HEALTH_TIMEOUT_MS,
        );

        try {
          const res = await fetch(getHealthUrl(), {
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (cancelled) return;
          if (res.ok) {
            // Server is up — socket should reconnect on its own.
            failures = 0;
          } else {
            failures++;
            if (failures >= RECONNECT_FAILURE_THRESHOLD) {
              clearTimeout(graceTimer);
              cancelled = true;
              setStatus('disconnected');
              return;
            }
          }
        } catch {
          clearTimeout(timeout);
          if (cancelled) return;
          failures++;
          if (failures >= RECONNECT_FAILURE_THRESHOLD) {
            clearTimeout(graceTimer);
            cancelled = true;
            setStatus('disconnected');
            return;
          }
        }

        setTimeout(() => checkHealth(), HEALTH_RETRY_DELAY_MS);
      }

      checkHealth();

      reconnectCleanup.current = () => {
        cancelled = true;
        clearTimeout(graceTimer);
      };
    });

    socket.on('connect', () => {
      // Cancel reconnect check if running
      reconnectCleanup.current?.();
      reconnectCleanup.current = null;
      hasGoneOnline.current = true;
      setStatus('online');
    });
  }, []);

  return (
    <ServerStatusContext.Provider
      value={{ status, isReady: status === 'online', registerSocket }}
    >
      {children}
    </ServerStatusContext.Provider>
  );
}

export function useServerStatus(): ServerStatusContextValue {
  const ctx = useContext(ServerStatusContext);
  if (!ctx) {
    throw new Error('useServerStatus must be used within ServerStatusProvider');
  }
  return ctx;
}
