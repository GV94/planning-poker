import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button.jsx';
import {
  getLobbySession,
  setLobbySession,
  type LobbySession,
} from '../../p2p/lobby-session.js';
import { castVote, joinLobby } from '../../p2p/lobby-connection.js';
import type { PlanningPokerCard } from 'shared-types';

export function LobbyPage() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const [session, setSession] = useState<LobbySession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

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
  ];

  useEffect(() => {
    // First, try to reuse an existing in-memory session (host flow).
    const current = getLobbySession();
    if (current && (!lobbyId || current.lobbyId === lobbyId)) {
      setSession(current);
      setError(null);
      return;
    }

    // If we don't have a stored session but we do have a lobbyId in the URL,
    // we'll show a form to let the user enter their display name and join.
    if (!lobbyId) {
      setError('Missing lobby id');
      setSession(null);
      return;
    }
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

    socket.on('lobby:participant-joined', handleParticipantJoined);
    socket.on('lobby:voted', handleVoted);

    return () => {
      socket.off('lobby:participant-joined', handleParticipantJoined);
      socket.off('lobby:voted', handleVoted);
    };
  }, [session]);

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
        socket,
      } = await joinLobby(lobbyId, name.trim() || 'Anonymous');
      const newSession: LobbySession = {
        lobbyId: joinedId,
        hostId,
        selfId: clientId,
        participants,
        socket,
      };
      setLobbySession(newSession);
      setSession(newSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join lobby');
    } finally {
      setIsJoining(false);
    }
  }

  if (!session) {
    // No active session yet: show join form.
    return (
      <form
        onSubmit={handleJoinSubmit}
        className="flex flex-col items-start gap-3"
      >
        <h2 className="text-xl font-semibold">
          Join lobby {lobbyId ?? '(unknown)'}
        </h2>
        <input
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-400"
          placeholder="Your display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={isJoining}>
          {isJoining ? 'Joining...' : 'Join lobby'}
        </Button>
      </form>
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
  const others = session.participants?.filter(
    (p) => p.clientId !== session.selfId
  );

  return (
    <div>
      <h2>Lobby {session.lobbyId}</h2>
      <p>Host ID: {session.hostId}</p>
      <p>Socket ID: {session.socket.id}</p>
      <div className="mt-4">
        <h3 className="mb-2 font-medium">Your vote</h3>
        <div className="flex flex-wrap gap-2">
          {CARDS.map((card) => (
            <Button
              key={card}
              type="button"
              variant={self?.vote === card ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleVote(card)}
            >
              {card}
            </Button>
          ))}
        </div>
      </div>
      <h3>Other participants</h3>
      {others.length === 0 ? (
        <p>No other users yet.</p>
      ) : (
        <ul>
          {others.map((p) => (
            <li key={p.clientId}>
              {p.name}
              {p.isAdmin ? ' (admin)' : ''}
              {p.vote != null ? ` (${p.vote})` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
