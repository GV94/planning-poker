import {
  createContext,
  useContext,
  useState,
  useEffect,
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

const WAKING_THRESHOLD_MS = 2000;
const HEALTH_TIMEOUT_MS = 60000;
const HEALTH_RETRY_DELAY_MS = 3000;

function getHealthUrl(): string {
  const base = import.meta.env.VITE_P2P_BASE as string | undefined;
  if (!base) throw new Error('VITE_P2P_BASE is required');
  return `${base.replace(/\/$/, '')}/health`;
}

export function ServerStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ServerStatus>('checking');
  const socketRef = useRef<Socket | null>(null);
  const hasGoneOnline = useRef(false);

  // Health check on mount
  useEffect(() => {
    let cancelled = false;
    let wakingTimer: ReturnType<typeof setTimeout> | undefined;

    async function checkHealth() {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        HEALTH_TIMEOUT_MS
      );

      // Start a timer: if the response doesn't arrive within the threshold,
      // transition to 'waking'.
      wakingTimer = setTimeout(() => {
        if (!cancelled) setStatus('waking');
      }, WAKING_THRESHOLD_MS);

      try {
        const res = await fetch(getHealthUrl(), {
          signal: controller.signal,
        });
        clearTimeout(wakingTimer);
        clearTimeout(timeout);
        if (!cancelled && res.ok) {
          hasGoneOnline.current = true;
          setStatus('online');
        }
      } catch {
        clearTimeout(wakingTimer);
        clearTimeout(timeout);
        if (!cancelled) {
          setStatus('waking');
          // Retry after a delay
          setTimeout(() => {
            if (!cancelled) checkHealth();
          }, HEALTH_RETRY_DELAY_MS);
        }
      }
    }

    checkHealth();

    return () => {
      cancelled = true;
      if (wakingTimer) clearTimeout(wakingTimer);
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
      setStatus('disconnected');
    });

    socket.on('connect', () => {
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
