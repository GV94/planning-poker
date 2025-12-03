import type { Socket } from 'socket.io-client';
import type { ParticipantInfo } from './lobby-connection.js';

export interface LobbySession {
  lobbyId: string;
  hostId: string;
  selfId: string;
  participants: ParticipantInfo[];
  isRevealed: boolean;
  socket: Socket;
}

let currentSession: LobbySession | null = null;

export function setLobbySession(session: LobbySession | null) {
  currentSession = session;
}

export function getLobbySession(): LobbySession | null {
  return currentSession;
}
