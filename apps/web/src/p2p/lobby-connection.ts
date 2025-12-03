import { io, type Socket } from 'socket.io-client';

export interface CreateLobbyResult {
  lobbyId: string;
  hostId: string;
  socket: Socket;
}

export interface JoinLobbyResult {
  lobbyId: string;
  hostId: string;
  clientId: string;
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
 *   const { lobbyId, hostId, socket } = await createLobby();
 */
export function createLobby(): Promise<CreateLobbyResult> {
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
      // ask the server to create a new lobby. We don't send any payload here;
      // the server is responsible for generating a fresh lobbyId.
      socket.emit(
        'lobby:create',
        // Socket.io "ack" callback: the server calls this with the created lobby info.
        (payload: { lobbyId: string; hostId: string }) => {
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
 *   const { lobbyId, hostId, clientId, socket } = await joinLobby(lobbyId);
 */
export function joinLobby(lobbyId: string): Promise<JoinLobbyResult> {
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
      socket.emit('lobby:join', { lobbyId }, (payload: JoinLobbyAckPayload) => {
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
          socket,
        });
      });
    };

    socket.once('connect_error', onError);
    socket.once('connect', onConnect);
  });
}
