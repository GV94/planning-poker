import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button.jsx';
import { createLobby } from '../../p2p/lobby-connection.js';
import { setLobbySession } from '../../p2p/lobby-session.js';

export function LandingPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');

  async function handleCreateLobby() {
    const trimmedName = name.trim() || 'Anonymous';

    const { lobbyId, hostId, clientId, participants, isRevealed, socket } =
      await createLobby(trimmedName);
    // Persist the live socket connection and identifiers so the lobby page
    // can reuse the same session after navigation.
    if (socket) {
      setLobbySession({
        lobbyId,
        hostId,
        selfId: clientId,
        participants,
        isRevealed,
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
      <div className="flex items-center gap-3">
        <input
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-400"
          placeholder="Your display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button size="lg" onClick={handleCreateLobby}>
          Create lobby
        </Button>
      </div>
    </section>
  );
}
