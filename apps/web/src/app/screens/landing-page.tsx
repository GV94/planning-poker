import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button.jsx';
import { createLobby } from '../../p2p/lobby-connection.js';
import { saveClientSession, setLobbySession } from '../../p2p/lobby-session.js';

export function LandingPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');

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
      saveClientSession({ lobbyId, name: trimmedName, clientId });
      navigate(`/lobby/${lobbyId}`);
    }
  }

  function handleJoinLobbySubmit(event: React.FormEvent) {
    event.preventDefault();
    const code = joinCode.trim();
    if (!code) return;
    navigate(`/lobby/${code}`);
  }

  return (
    <section className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-[1.6fr,1.2fr]">
        <div className="space-y-6">
          <header className="space-y-3 text-left">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
              Lightweight planning poker
            </h1>
            <p className="text-sm text-slate-400 md:text-base">
              Spin up a lobby in seconds, share the link, and estimate stories
              together. Real-time, low-friction, and powered by a minimal
              signalling backend.
            </p>
          </header>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.7)] backdrop-blur transition hover:border-slate-500/70 hover:shadow-[0_22px_55px_rgba(15,23,42,0.9)]">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
              Start a new lobby
            </h2>
            <p className="mb-4 text-xs text-slate-400">
              Choose a display name and we&apos;ll create a fresh lobby for your
              team.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="flex-1 rounded-md border border-slate-700/80 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-500"
                placeholder="Your display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button
                size="lg"
                className="w-full sm:w-auto transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
                onClick={handleCreateLobby}
              >
                Create lobby
              </Button>
            </div>
          </div>

          <div className="hidden text-sm text-slate-500 md:block">
            <p className="mb-1 font-medium text-slate-300">How it works</p>
            <ul className="space-y-1 text-xs text-slate-400">
              <li>1. Create a lobby and share the URL.</li>
              <li>2. Everyone joins with their name and picks a card.</li>
              <li>3. The owner reveals votes when ready, then can reset.</li>
            </ul>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 shadow-inner shadow-slate-950/40">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
              Join existing lobby
            </h2>
            <p className="mb-3 text-xs text-slate-400">
              Paste a lobby ID from a link you&apos;ve received.
            </p>
            <form
              onSubmit={handleJoinLobbySubmit}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <input
                className="flex-1 rounded-md border border-slate-700/80 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-500"
                placeholder="Lobby ID (e.g. from URL)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full border-slate-700 text-slate-100 hover:border-slate-500 hover:bg-slate-800 sm:w-auto"
              >
                Join lobby
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
