import { io as ioClient, type Socket } from 'socket.io-client';
import { getPort } from './setup.js';
import { afterEach } from 'vitest';

const activeSockets: Socket[] = [];

afterEach(() => {
  // Disconnect all sockets created during the test to prevent leaks
  for (const s of activeSockets) {
    if (s.connected) s.disconnect();
  }
  activeSockets.length = 0;
});

export function createClient(): Socket {
  const socket = ioClient(`http://localhost:${getPort()}`, {
    transports: ['websocket'],
    forceNew: true,
  });
  activeSockets.push(socket);
  return socket;
}

export function waitForConnect(socket: Socket): Promise<void> {
  if (socket.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
}

export interface LobbyOwner {
  socket: Socket;
  lobbyId: string;
  hostId: string;
  clientId: string;
}

export async function createLobbyHelper(name?: string): Promise<LobbyOwner> {
  const socket = createClient();
  await waitForConnect(socket);

  const response = await new Promise<Record<string, unknown>>((resolve) => {
    socket.emit('lobby:create', { name: name ?? 'Host' }, resolve);
  });

  if (!response.ok) {
    throw new Error(`Failed to create lobby: ${response.error}`);
  }

  return {
    socket,
    lobbyId: response.lobbyId as string,
    hostId: response.hostId as string,
    clientId: response.clientId as string,
  };
}

export interface LobbyParticipant {
  socket: Socket;
  clientId: string;
}

export async function joinLobbyHelper(
  lobbyId: string,
  name?: string
): Promise<LobbyParticipant> {
  const socket = createClient();
  await waitForConnect(socket);

  const response = await new Promise<Record<string, unknown>>((resolve) => {
    socket.emit('lobby:join', { lobbyId, name: name ?? 'Player' }, resolve);
  });

  if (!response.ok) {
    throw new Error(`Failed to join lobby: ${response.error}`);
  }

  return {
    socket,
    clientId: response.clientId as string,
  };
}

export function emitWithAck<T = Record<string, unknown>>(
  socket: Socket,
  event: string,
  data: Record<string, unknown>
): Promise<T> {
  return new Promise((resolve) => {
    socket.emit(event, data, resolve);
  });
}

export function waitForEvent<T = Record<string, unknown>>(
  socket: Socket,
  event: string,
  timeoutMs = 2000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout waiting for event "${event}"`));
    }, timeoutMs);

    const handler = (data: T) => {
      clearTimeout(timer);
      resolve(data);
    };

    socket.once(event, handler);
  });
}
