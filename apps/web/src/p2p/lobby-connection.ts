import { io, type Socket } from 'socket.io-client';
import type { PlanningPokerCard } from 'shared-types';

export interface ParticipantInfo {
  clientId: string;
  name: string;
  vote?: PlanningPokerCard;
  isAdmin: boolean;
}

export interface CreateLobbyResult {
  lobbyId: string;
  hostId: string;
  clientId: string;
  participants: ParticipantInfo[];
  isRevealed: boolean;
  socket: Socket;
}

export interface JoinLobbyResult {
  lobbyId: string;
  hostId: string;
  clientId: string;
  participants: ParticipantInfo[];
  isRevealed: boolean;
  socket: Socket;
}

function getP2PBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_P2P_BASE as string | undefined;
  return fromEnv ?? 'http://localhost:3002';
}

/**
 * Connects to the p2p-manager socket.io server and creates a new lobby.
 *
 * Usage:
 *   const { lobbyId, hostId, socket } = await createLobby(name);
 */
export function createLobby(name: string): Promise<CreateLobbyResult> {
  const baseUrl = getP2PBaseUrl();

  const socket = io(baseUrl, {
    transports: ['websocket'],
  });

  return new Promise<CreateLobbyResult>((resolve, reject) => {
    const onError = (err: Error) => {
      socket.off('connect_error', onError);
      socket.off('connect', onConnect);
      reject(err);
    };

    const onConnect = () => {
      // Once the WebSocket connection to the p2p-manager server is established,
      // ask the server to create a new lobby, providing our display name.
      socket.emit(
        'lobby:create',
        { name },
        (payload: {
          lobbyId: string;
          hostId: string;
          clientId: string;
          participants: ParticipantInfo[];
          isRevealed: boolean;
        }) => {
          // We successfully created a lobby, so we no longer need to listen
          // for connection errors on this initial handshake.
          socket.off('connect_error', onError);
          // Resolve the outer Promise with the lobby identifiers plus the live socket
          // so callers can keep using it for further communication.
          resolve({ ...payload, socket });
        }
      );
    };

    socket.once('connect_error', onError);
    socket.once('connect', onConnect);
  });
}

interface JoinLobbySuccessPayload {
  ok: true;
  lobbyId: string;
  hostId: string;
  clientId: string;
  participants: ParticipantInfo[];
  isRevealed: boolean;
}

interface JoinLobbyErrorPayload {
  ok: false;
  error: string;
}

type JoinLobbyAckPayload = JoinLobbySuccessPayload | JoinLobbyErrorPayload;

/**
 * Connects to the p2p-manager and joins an existing lobby by id.
 *
 * Usage:
 *   const { lobbyId, hostId, clientId, socket } = await joinLobby(lobbyId, name);
 */
export function joinLobby(
  lobbyId: string,
  name: string,
  clientId?: string
): Promise<JoinLobbyResult> {
  const baseUrl = getP2PBaseUrl();

  const socket = io(baseUrl, {
    transports: ['websocket'],
  });

  return new Promise<JoinLobbyResult>((resolve, reject) => {
    const onError = (err: Error) => {
      socket.off('connect_error', onError);
      socket.off('connect', onConnect);
      reject(err);
    };

    const onConnect = () => {
      socket.emit(
        'lobby:join',
        { lobbyId, name, clientId },
        (payload: JoinLobbyAckPayload) => {
          if (!payload?.ok) {
            socket.disconnect();
            reject(new Error(payload?.error ?? 'Failed to join lobby'));
            return;
          }

          socket.off('connect_error', onError);
          resolve({
            lobbyId: payload.lobbyId,
            hostId: payload.hostId,
            clientId: payload.clientId,
            participants: payload.participants,
            isRevealed: payload.isRevealed,
            socket,
          });
        }
      );
    };

    socket.once('connect_error', onError);
    socket.once('connect', onConnect);
  });
}

export function castVote(
  socket: Socket,
  lobbyId: string,
  card: PlanningPokerCard | null
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    socket.emit(
      'lobby:vote',
      { lobbyId, card },
      (payload?: { ok: boolean; error?: string }) => {
        if (!payload?.ok) {
          reject(new Error(payload?.error ?? 'Failed to cast vote'));
          return;
        }
        resolve();
      }
    );
  });
}

export function revealCards(socket: Socket, lobbyId: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    socket.emit(
      'lobby:reveal',
      { lobbyId },
      (payload?: { ok: boolean; error?: string }) => {
        if (!payload?.ok) {
          reject(new Error(payload?.error ?? 'Failed to reveal votes'));
          return;
        }
        resolve();
      }
    );
  });
}

export function resetLobby(socket: Socket, lobbyId: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    socket.emit(
      'lobby:reset',
      { lobbyId },
      (payload?: { ok: boolean; error?: string }) => {
        if (!payload?.ok) {
          reject(new Error(payload?.error ?? 'Failed to reset lobby'));
          return;
        }
        resolve();
      }
    );
  });
}
