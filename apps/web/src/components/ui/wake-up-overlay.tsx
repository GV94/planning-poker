import { useState, useEffect, useRef } from 'react';

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
const SUCCESS_DISPLAY_MS = 1500;

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
    () => Math.floor(Math.random() * LOADING_MESSAGES.length)
  );
  const [isFadingMessage, setIsFadingMessage] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const wasVisible = useRef(visible);

  // Rotate messages
  useEffect(() => {
    if (!visible || showSuccess) return;

    const interval = setInterval(() => {
      setIsFadingMessage(true);
      setTimeout(() => {
        setMessageIndex(
          (prev) => (prev + 1) % LOADING_MESSAGES.length
        );
        setIsFadingMessage(false);
      }, 300);
    }, MESSAGE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [visible, showSuccess]);

  // Detect transition from visible to not visible (server came online)
  useEffect(() => {
    if (wasVisible.current && !visible) {
      // Show success state, then fade out
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setFadingOut(true);
        const fadeTimer = setTimeout(() => {
          setShowSuccess(false);
          setFadingOut(false);
          onFadeOutComplete?.();
        }, 800);
        return () => clearTimeout(fadeTimer);
      }, SUCCESS_DISPLAY_MS);
      return () => clearTimeout(timer);
    }
    wasVisible.current = visible;
  }, [visible, onFadeOutComplete]);

  if (!visible && !showSuccess && !fadingOut) return null;

  const baseClasses =
    mode === 'blocking'
      ? 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950'
      : 'absolute inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm';

  return (
    <div
      className={`${baseClasses} ${fadingOut ? 'animate-fade-out' : 'animate-fade-in'}`}
    >
      <div className="flex flex-col items-center gap-6 px-4 text-center">
        {showSuccess ? (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <svg
                className="h-8 w-8 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-slate-100">
              Everything is set up for you, happy planning!
            </p>
          </div>
        ) : (
          <>
            {/* Breathing animation */}
            <div className="animate-breathing h-20 w-20 rounded-full bg-gradient-to-br from-sky-400/40 to-slate-500/30" />

            {/* Rotating message */}
            <p
              className={`h-6 text-sm text-slate-300 transition-opacity duration-300 ${
                isFadingMessage ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {LOADING_MESSAGES[messageIndex]}
            </p>

            {/* Progress shimmer bar */}
            <div className="h-1 w-48 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-full animate-shimmer rounded-full bg-gradient-to-r from-transparent via-sky-400/40 to-transparent bg-[length:200%_100%]" />
            </div>

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
                    Plokr runs on free infrastructure that scales to zero when
                    nobody is using it. When you're the first visitor in a while,
                    the server needs a moment to wake up.
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-slate-300">
                    <span className="text-pink-400" aria-hidden="true">
                      &#9829;
                    </span>
                    Want faster starts? Consider sponsoring the project to help
                    keep the servers warm.
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
