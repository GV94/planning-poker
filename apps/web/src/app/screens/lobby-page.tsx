import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getLobbySession,
  setLobbySession,
  type LobbySession,
} from '../../p2p/lobby-session.js';
import { joinLobby } from '../../p2p/lobby-connection.js';

export function LobbyPage() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const [session, setSession] = useState<LobbySession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ensureSession() {
      // First, try to reuse an existing in-memory session (host flow).
      const current = getLobbySession();
      if (current && (!lobbyId || current.lobbyId === lobbyId)) {
        if (!cancelled) {
          setSession(current);
          setError(null);
        }
        return;
      }

      // If we don't have a stored session but we do have a lobbyId in the URL,
      // we treat this as a "join existing lobby" flow.
      if (!lobbyId) {
        if (!cancelled) {
          setError('Missing lobby id');
          setSession(null);
        }
        return;
      }

      try {
        setSession(null);
        setError(null);
        const {
          lobbyId: joinedId,
          hostId,
          clientId,
          participants,
          socket,
        } = await joinLobby(lobbyId);
        if (cancelled) {
          socket.disconnect();
          return;
        }
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
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to join lobby');
        }
      }
    }

    void ensureSession();

    return () => {
      cancelled = true;
    };
  }, [lobbyId]);

  // Keep participants list in sync as others join while we're in the lobby.
  useEffect(() => {
    if (!session) return;

    const { socket } = session;

    function handleParticipantJoined(event: {
      lobbyId: string;
      clientId: string;
    }) {
      setSession((prev) => {
        if (!prev || prev.lobbyId !== event.lobbyId) return prev;
        if (prev.participants.includes(event.clientId)) return prev;
        const updated: LobbySession = {
          ...prev,
          participants: [...prev.participants, event.clientId],
        };
        setLobbySession(updated);
        return updated;
      });
    }

    socket.on('lobby:participant-joined', handleParticipantJoined);

    return () => {
      socket.off('lobby:participant-joined', handleParticipantJoined);
    };
  }, [session]);

  if (error) {
    return <div>Failed to connect to lobby: {error}</div>;
  }

  if (!session) {
    return <div>Connecting to lobby...</div>;
  }

  const others = session.participants?.filter((id) => id !== session.selfId);

  return (
    <div>
      <h2>Lobby {session.lobbyId}</h2>
      <p>Host ID: {session.hostId}</p>
      <p>Socket ID: {session.socket.id}</p>
      <h3>Other participants</h3>
      {others.length === 0 ? (
        <p>No other users yet.</p>
      ) : (
        <ul>
          {others.map((id) => (
            <li key={id}>{id}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
