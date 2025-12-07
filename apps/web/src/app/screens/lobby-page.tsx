import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button.jsx';
import { Clipboard, Check } from 'lucide-react';
import {
  getLobbySession,
  loadClientSession,
  saveClientSession,
  setLobbySession,
  type LobbySession,
} from '../../p2p/lobby-session.js';
import {
  castVote,
  joinLobby,
  revealCards,
  resetLobby,
  lobbyExists,
  syncLobby,
} from '../../p2p/lobby-connection.js';
import type { PlanningPokerCard } from 'shared-types';

export default function LobbyPage() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<LobbySession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(() => {
    const stored = loadClientSession();
    return stored?.name ?? '';
  });
  const [isJoining, setIsJoining] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  const CARDS: PlanningPokerCard[] = [
    0,
    0.5,
    1,
    2,
    3,
    5,
    8,
    13,
    21,
    34,
    55,
    100,
    '?',
    '☕',
  ];

  useEffect(() => {
    let cancelled = false;

    async function ensureSession() {
      // First, try to reuse an existing in-memory session (host flow).
      const current = getLobbySession();
      if (current && (!lobbyId || current.lobbyId === lobbyId)) {
        if (!cancelled) {
          setSession(current);
          setError(null);
          setIsChecking(false);
        }
        return;
      }

      if (!lobbyId) {
        if (!cancelled) {
          setError('Missing lobby id');
          setSession(null);
          setIsChecking(false);
        }
        return;
      }

      // First, check if the lobby exists at all before prompting for name.
      const exists = await lobbyExists(lobbyId);
      if (!exists) {
        if (!cancelled) {
          setError('Lobby not found');
          setSession(null);
          setIsChecking(false);
        }
        return;
      }

      // If we have a stored client session for this lobby, automatically rejoin
      // without showing the join form (e.g. after a page refresh).
      const stored = loadClientSession();
      if (stored && stored.lobbyId === lobbyId) {
        const displayName = stored.name.trim() || 'Anonymous';
        setName(displayName);
        try {
          const {
            lobbyId: joinedId,
            hostId,
            clientId,
            participants,
            isRevealed,
            socket,
          } = await joinLobby(lobbyId, displayName, stored.clientId);
          if (cancelled) {
            socket.disconnect();
            return;
          }
          const newSession: LobbySession = {
            lobbyId: joinedId,
            hostId,
            selfId: clientId,
            participants,
            isRevealed,
            socket,
          };
          setLobbySession(newSession);
          setSession(newSession);
          setError(null);
        } catch (err) {
          if (!cancelled) {
            setError(
              err instanceof Error ? err.message : 'Failed to rejoin lobby'
            );
          }
        } finally {
          if (!cancelled) {
            setIsChecking(false);
          }
        }
        return;
      }

      if (!cancelled) {
        setIsChecking(false);
      }
    }

    void ensureSession();

    return () => {
      cancelled = true;
    };
  }, [lobbyId]);

  // Keep participants list in sync as others join / vote while we're in the lobby.
  useEffect(() => {
    if (!session) return;

    const { socket } = session;

    function handleParticipantJoined(event: {
      lobbyId: string;
      clientId: string;
      name: string;
    }) {
      setSession((prev) => {
        if (!prev || prev.lobbyId !== event.lobbyId) return prev;
        if (prev.participants.some((p) => p.clientId === event.clientId)) {
          return prev;
        }
        const updated: LobbySession = {
          ...prev,
          participants: [
            ...prev.participants,
            { clientId: event.clientId, name: event.name, isAdmin: false },
          ],
        };
        setLobbySession(updated);
        return updated;
      });
    }

    function handleVoted(event: {
      lobbyId: string;
      clientId: string;
      card: PlanningPokerCard | null;
    }) {
      setSession((prev) => {
        if (!prev || prev.lobbyId !== event.lobbyId) return prev;
        const updatedParticipants = prev.participants.map((p) =>
          p.clientId === event.clientId
            ? { ...p, vote: event.card ?? undefined }
            : p
        );
        const updated: LobbySession = {
          ...prev,
          participants: updatedParticipants,
        };
        setLobbySession(updated);
        return updated;
      });
    }

    function handleRevealed(event: { lobbyId: string }) {
      setSession((prev) => {
        if (!prev || prev.lobbyId !== event.lobbyId) return prev;
        const updated: LobbySession = { ...prev, isRevealed: true };
        setLobbySession(updated);
        return updated;
      });
    }

    function handleReset(event: { lobbyId: string }) {
      setSession((prev) => {
        if (!prev || prev.lobbyId !== event.lobbyId) return prev;
        const clearedParticipants = prev.participants.map((p) => ({
          ...p,
          vote: undefined,
        }));
        const updated: LobbySession = {
          ...prev,
          participants: clearedParticipants,
          isRevealed: false,
        };
        setLobbySession(updated);
        return updated;
      });
    }

    socket.on('lobby:participant-joined', handleParticipantJoined);
    socket.on('lobby:voted', handleVoted);
    socket.on('lobby:revealed', handleRevealed);
    socket.on('lobby:reset', handleReset);

    // Refresh state when tab becomes visible (handles background throttling/disconnects)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void (async () => {
          try {
            const synced = await syncLobby(
              socket,
              session.lobbyId,
              session.selfId
            );
            setSession((prev) => {
              if (!prev || prev.lobbyId !== synced.lobbyId) return prev;
              const updated: LobbySession = {
                ...prev,
                hostId: synced.hostId,
                participants: synced.participants,
                isRevealed: synced.isRevealed,
              };
              setLobbySession(updated);
              return updated;
            });
          } catch (error) {
            console.error(
              'Failed to sync lobby state on visibility change',
              error
            );
          }
        })();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      socket.off('lobby:participant-joined', handleParticipantJoined);
      socket.off('lobby:voted', handleVoted);
      socket.off('lobby:revealed', handleRevealed);
      socket.off('lobby:reset', handleReset);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [session]);

  if (error === 'Lobby not found') {
    return (
      <section className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-slate-950 px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-xl shadow-slate-950/60">
          <h2 className="text-lg font-semibold text-slate-50">
            Lobby not found
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            There&apos;s no lobby with ID{' '}
            <span className="font-mono text-slate-100">{lobbyId}</span>. It may
            have expired or been closed.
          </p>
          <div className="mt-5 flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/')}
              className="px-4"
            >
              Back to start
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (isChecking) {
    return (
      <section className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-slate-950 px-4 py-10">
        <div className="flex flex-col items-center gap-3 text-center text-slate-200">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400" />
          <p className="text-sm text-slate-300">
            Connecting to lobby <span className="font-mono">{lobbyId}</span>...
          </p>
        </div>
      </section>
    );
  }

  if (error) {
    return <div>Failed to connect to lobby: {error}</div>;
  }

  async function handleJoinSubmit(event: FormEvent) {
    event.preventDefault();
    if (!lobbyId || isJoining) return;
    setIsJoining(true);
    setError(null);
    try {
      const {
        lobbyId: joinedId,
        hostId,
        clientId,
        participants,
        isRevealed,
        socket,
      } = await joinLobby(lobbyId, name.trim() || 'Anonymous');
      const newSession: LobbySession = {
        lobbyId: joinedId,
        hostId,
        selfId: clientId,
        participants,
        isRevealed,
        socket,
      };
      setLobbySession(newSession);
      setSession(newSession);
      saveClientSession({
        lobbyId: joinedId,
        name: name.trim() || 'Anonymous',
        clientId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join lobby');
    } finally {
      setIsJoining(false);
    }
  }

  if (!session) {
    // No active session yet: show join form.
    return (
      <section className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-slate-950 px-4 py-10">
        <form
          onSubmit={handleJoinSubmit}
          className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/60 backdrop-blur-sm"
        >
          <h2 className="text-xl font-semibold text-slate-50">
            Join lobby{' '}
            <span className="font-mono text-slate-300">{lobbyId}</span>
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            Enter your display name to join this planning session.
          </p>
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-slate-400">
              Display name
            </label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-500"
              placeholder="Your display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              type="submit"
              disabled={isJoining}
              className="mt-2 w-full transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
            >
              {isJoining ? 'Joining...' : 'Join lobby'}
            </Button>
          </div>
        </form>
      </section>
    );
  }

  async function handleVote(card: PlanningPokerCard | null) {
    try {
      if (!session) return;
      await castVote(session.socket, session.lobbyId, card);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cast vote');
    }
  }

  const self = session.participants.find((p) => p.clientId === session.selfId);
  const participants = session.participants;
  const isAdmin = self?.isAdmin ?? false;

  async function handleReveal() {
    try {
      if (!session) return;
      setIsRevealing(true);
      await revealCards(session.socket, session.lobbyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal votes');
    } finally {
      setIsRevealing(false);
    }
  }

  async function handleReset() {
    try {
      if (!session) return;
      setIsResetting(true);
      await resetLobby(session.socket, session.lobbyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset lobby');
    } finally {
      setIsResetting(false);
    }
  }

  async function handleCopyLink() {
    try {
      if (typeof window === 'undefined' || !window.location) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = window.location.href;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setHasCopiedLink(true);
      setTimeout(() => setHasCopiedLink(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy link');
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-4rem)] w-full items-start justify-center bg-slate-950 px-1 py-8 md:py-10">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/60 backdrop-blur-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Lobby
            </p>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-50 md:text-2xl">
                <span className="font-mono text-sky-300">
                  {session.lobbyId}
                </span>
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="h-8 w-8 p-0"
                aria-label={hasCopiedLink ? 'Link copied' : 'Copy lobby link'}
                title={hasCopiedLink ? 'Link copied' : 'Copy lobby link'}
              >
                {hasCopiedLink ? (
                  <Check
                    className="h-4 w-4 text-emerald-300"
                    aria-hidden="true"
                  />
                ) : (
                  <Clipboard
                    className="h-4 w-4 text-slate-200"
                    aria-hidden="true"
                  />
                )}
              </Button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[1.3fr,1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-md shadow-slate-950/50">
            <h3 className="mb-3 text-sm font-medium text-slate-200">
              Your estimate
            </h3>
            <p className="mb-4 text-xs text-slate-400">
              Click a card below to cast or change your vote. You&apos;ll see
              everyone else&apos;s numbers once the admin reveals them.
            </p>
            <div className="flex flex-wrap gap-2">
              {CARDS.map((card) => (
                <Button
                  key={card}
                  type="button"
                  variant={self?.vote === card ? 'default' : 'outline'}
                  size="sm"
                  className={`min-w-[2.5rem] border-slate-700/70 text-xs transition-transform duration-150 ${
                    self?.vote === card
                      ? 'shadow-lg shadow-sky-500/30'
                      : 'hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-800'
                  }`}
                  onClick={() => handleVote(card)}
                >
                  {card}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-md shadow-slate-950/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-200 ">Votes</h3>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition ${
                    session.isRevealed
                      ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/40'
                      : 'bg-slate-800 text-slate-300 ring-1 ring-slate-700'
                  }`}
                >
                  <span
                    className={`mr-2 h-1.5 w-1.5 rounded-full ${
                      session.isRevealed ? 'bg-emerald-400' : 'bg-slate-400'
                    }`}
                  />
                  {session.isRevealed ? 'Votes revealed' : 'Waiting for reveal'}
                </span>
              </div>
              <div className="mb-3 flex items-center justify-between gap-3">
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={session.isRevealed ? 'outline' : 'default'}
                      size="sm"
                      disabled={session.isRevealed || isRevealing}
                      onClick={handleReveal}
                      className="transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <span className="mr-1 inline-flex h-3 w-3 items-center justify-center">
                        <svg
                          viewBox="0 0 20 20"
                          className="h-3 w-3"
                          aria-hidden="true"
                        >
                          <path
                            d="M2 10c1.6-3 4.2-5 8-5s6.4 2 8 5c-1.6 3-4.2 5-8 5s-6.4-2-8-5Z"
                            className="fill-current"
                          />
                          <circle
                            cx="10"
                            cy="10"
                            r="2.5"
                            className="bg-slate-950 fill-slate-950"
                          />
                        </svg>
                      </span>
                      {session.isRevealed ? 'Revealed' : 'Reveal'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isResetting}
                      onClick={handleReset}
                    >
                      <span className="mr-1 inline-flex h-3 w-3 items-center justify-center">
                        <svg
                          viewBox="0 0 20 20"
                          className="h-3 w-3"
                          aria-hidden="true"
                        >
                          <path
                            d="M10 3a7 7 0 1 1-4.95 2.05"
                            className="fill-none stroke-current"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                          <path
                            d="M4 3h4v4"
                            className="fill-none stroke-current"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                      {isResetting ? 'Resetting...' : 'Reset'}
                    </Button>
                  </div>
                )}
              </div>
              {participants.length === 0 ? (
                <p className="text-xs text-slate-400">No users yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {participants.map((p) => {
                    const isSelfRow = p.clientId === session.selfId;
                    return (
                      <li
                        key={p.clientId}
                        className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2 text-slate-100 shadow-sm shadow-slate-950/40"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">
                            {p.name}{' '}
                            {isSelfRow && (
                              <span className="text-[10px] uppercase tracking-wide text-sky-300">
                                (you)
                              </span>
                            )}{' '}
                            {p.isAdmin && (
                              <span className="text-[10px] uppercase tracking-wide text-amber-300">
                                owner
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {p.vote == null ? 'No vote yet' : 'Voted'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.vote == null ? (
                            <span className="text-[11px] font-medium text-slate-500">
                              No vote
                            </span>
                          ) : session.isRevealed ? (
                            <div className="inline-flex min-w-[3rem] items-center justify-center rounded-lg bg-slate-800 px-3 py-1 text-lg font-semibold text-slate-50">
                              {p.vote}
                            </div>
                          ) : (
                            <span className="text-[11px] font-medium text-sky-300">
                              Ready
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
