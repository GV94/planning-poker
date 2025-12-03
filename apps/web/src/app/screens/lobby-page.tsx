import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getLobbySession, type LobbySession } from '../../p2p/lobby-session.js';

export function LobbyPage() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const [session, setSession] = useState<LobbySession | null>(null);

  useEffect(() => {
    // For now we only support navigating here right after creating a lobby.
    // In that flow, the landing page stored the active session in memory.
    const current = getLobbySession();
    if (current && (!lobbyId || current.lobbyId === lobbyId)) {
      setSession(current);
    } else {
      // TODO: Implement \"join existing lobby\" for users who open a shared link.
      setSession(null);
    }
  }, [lobbyId]);

  if (!session) {
    return <div>Connecting to lobby...</div>;
  }

  return (
    <div>
      <h2>Lobby {session.lobbyId}</h2>
      <p>Host ID: {session.hostId}</p>
      <p>Socket ID: {session.socket.id}</p>
    </div>
  );
}
