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

const CLIENT_SESSION_KEY = 'planning-poker:lobby-client-session';

export interface StoredClientSession {
  lobbyId: string;
  name: string;
  clientId?: string;
}

export function setLobbySession(session: LobbySession | null) {
  currentSession = session;
}

export function getLobbySession(): LobbySession | null {
  return currentSession;
}

export function saveClientSession(data: StoredClientSession) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export function loadClientSession(): StoredClientSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CLIENT_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredClientSession;
    if (!parsed.lobbyId || typeof parsed.name !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearClientSession() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CLIENT_SESSION_KEY);
  } catch {
    // ignore
  }
}
