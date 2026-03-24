// @vitest-environment jsdom
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WakeUpOverlay } from './wake-up-overlay.jsx';

// Stub matchMedia so the component doesn't break in jsdom
beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  // Suppress rAF-based animation loop in tests
  vi.stubGlobal(
    'requestAnimationFrame',
    (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0) as unknown as number,
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

describe('WakeUpOverlay', () => {
  it('renders nothing when mounted with visible=false', () => {
    const { container } = render(
      <WakeUpOverlay mode="overlay" visible={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when mounted with visible=false in blocking mode', () => {
    const { container } = render(
      <WakeUpOverlay mode="blocking" visible={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders overlay content when visible=true', () => {
    render(<WakeUpOverlay mode="blocking" visible={true} />);
    expect(screen.getByText('Why am I seeing this?')).toBeTruthy();
  });

  it('starts fade-out transition when visible changes from true to false', () => {
    const onFadeOutComplete = vi.fn();
    const { rerender, container } = render(
      <WakeUpOverlay
        mode="blocking"
        visible={true}
        onFadeOutComplete={onFadeOutComplete}
      />,
    );

    // Overlay should be rendering
    expect(container.innerHTML).not.toBe('');

    // Transition to not visible
    rerender(
      <WakeUpOverlay
        mode="blocking"
        visible={false}
        onFadeOutComplete={onFadeOutComplete}
      />,
    );

    // During transition the overlay should still be in the DOM (fade-out in progress)
    expect(container.innerHTML).not.toBe('');
    // The success text appears during the transition phase
    expect(
      screen.getByText('Everything is set up for you, happy planning!'),
    ).toBeTruthy();
  });

  it('uses deterministic initial message index for SSR hydration safety', () => {
    // Math.random returning 0 → index 0 → first message
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<WakeUpOverlay mode="blocking" visible={true} />);
    expect(screen.getByText('Contacting the mothership...')).toBeTruthy();
    vi.restoreAllMocks();
  });

  it('never renders overlay content when visible stays false across rerenders', () => {
    const { container, rerender } = render(
      <WakeUpOverlay mode="overlay" visible={false} />,
    );
    expect(container.innerHTML).toBe('');

    // Rerender still with visible=false — should remain empty
    rerender(<WakeUpOverlay mode="overlay" visible={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('removes overlay after transition completes', async () => {
    vi.useFakeTimers();
    // Force reduced-motion path so transition uses setTimeout(1500) instead of rAF
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });

    const onFadeOutComplete = vi.fn();
    const { container, rerender } = render(
      <WakeUpOverlay
        mode="blocking"
        visible={true}
        onFadeOutComplete={onFadeOutComplete}
      />,
    );

    expect(container.innerHTML).not.toBe('');

    // Trigger fade-out
    rerender(
      <WakeUpOverlay
        mode="blocking"
        visible={false}
        onFadeOutComplete={onFadeOutComplete}
      />,
    );

    // Advance past the reduced-motion transition (1500ms)
    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(onFadeOutComplete).toHaveBeenCalledTimes(1);
    expect(container.innerHTML).toBe('');

    vi.useRealTimers();
  });
});
