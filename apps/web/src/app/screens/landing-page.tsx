import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button.jsx';
import { createLobby } from '../../p2p/lobby-connection.js';
import { setLobbySession } from '../../p2p/lobby-session.js';

export function LandingPage() {
  const navigate = useNavigate();

  async function handleCreateLobby() {
    const { lobbyId, hostId, clientId, participants, socket } =
      await createLobby();
    // Persist the live socket connection and identifiers so the lobby page
    // can reuse the same session after navigation.
    if (socket) {
      setLobbySession({
        lobbyId,
        hostId,
        selfId: clientId,
        participants,
        socket,
      });
      navigate(`/lobby/${lobbyId}`);
    }
  }

  return (
    <section className="flex w-full flex-col items-center justify-center gap-6 py-16">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Lightweight planning poker
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a lobby, share the link, and estimate stories together. All
          logic lives in the browser with a minimal signalling backend.
        </p>
      </div>
      <div className="flex gap-3">
        <Button size="lg" onClick={handleCreateLobby}>
          Create lobby
        </Button>
      </div>
    </section>
  );
}
