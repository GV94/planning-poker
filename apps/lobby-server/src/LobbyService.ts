import { randomBytes } from 'crypto';
import { createClient, type RedisClientType } from 'redis';
import type { ClientId, LobbyId } from 'shared-types';
import type { Lobby, StoredLobby } from './types.js';
import { fromStoredLobby, toStoredLobby } from './utils.js';

export const lobbies = new Map<LobbyId, Lobby>();
export const connections = new Map<
  string,
  { lobbyId: LobbyId; clientId: ClientId }
>();
export const lobbyRemovalTimers = new Map<
  LobbyId,
  ReturnType<typeof setTimeout>
>();

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is required but was not set');
}
const redisUsername = process.env.REDIS_USERNAME;
const redisPassword = process.env.REDIS_PASSWORD;
const redisPort = Number(process.env.REDIS_PORT) || 17837;

export const redis: RedisClientType = createClient({
  ...(redisUsername ? { username: redisUsername } : {}),
  ...(redisPassword ? { password: redisPassword } : {}),
  socket: {
    host: redisUrl,
    port: redisPort || 17837,
  },
});

redis.on('error', (err: unknown) => {
  console.error('Redis client error', err);
});

redis.connect().catch((err: unknown) => {
  console.error('Failed to connect to Redis at', redisUrl, err);
});

const LOBBY_KEY_PREFIX = 'lobby:';

export function lobbyKey(id: LobbyId): string {
  return `${LOBBY_KEY_PREFIX}${id}`;
}

export function generateLobbyId(): LobbyId {
  let id: LobbyId;
  do {
    id = randomBytes(6).toString('hex');
  } while (lobbies.has(id));
  return id;
}

export async function saveLobby(lobby: Lobby): Promise<void> {
  const stored = toStoredLobby(lobby);
  const key = lobbyKey(lobby.id);
  await redis.set(key, JSON.stringify(stored));
  // Refresh TTL on every write so lobbies expire after 24h of inactivity.
  await redis.expire(key, 60 * 60 * 24);
}

export async function loadLobby(lobbyId: LobbyId): Promise<Lobby | null> {
  const cached = lobbies.get(lobbyId);
  if (cached) return cached;

  const raw = await redis.get(lobbyKey(lobbyId));
  if (!raw) return null;

  let parsed: StoredLobby;
  try {
    parsed = JSON.parse(raw) as StoredLobby;
  } catch {
    return null;
  }

  const lobby = fromStoredLobby(parsed);
  lobbies.set(lobbyId, lobby);
  return lobby;
}
