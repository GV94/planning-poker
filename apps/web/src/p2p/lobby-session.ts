import type { Socket } from 'socket.io-client';

export interface LobbySession {
  lobbyId: string;
  hostId: string;
  socket: Socket;
}

let currentSession: LobbySession | null = null;

export function setLobbySession(session: LobbySession | null) {
  currentSession = session;
}

export function getLobbySession(): LobbySession | null {
  return currentSession;
}
