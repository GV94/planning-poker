import { createServer } from 'http';
import { randomUUID, randomBytes } from 'crypto';
// Typed import is declared in a local ambient module in this app to avoid
// depending on external type packages.
import { createClient, type RedisClientType } from 'redis';
import { Server, type Socket } from 'socket.io';
import type { LobbyId, ClientId, PlanningPokerCard } from 'shared-types';

interface ParticipantInfo {
  clientId: ClientId;
  name: string;
  vote?: PlanningPokerCard;
  isAdmin: boolean;
}

interface Lobby {
  id: LobbyId;
  hostId: ClientId;
  participants: Map<ClientId, ParticipantInfo>;
  isRevealed: boolean;
}

const lobbies = new Map<LobbyId, Lobby>();
const connections = new Map<string, { lobbyId: LobbyId; clientId: ClientId }>();
const lobbyRemovalTimers = new Map<LobbyId, ReturnType<typeof setTimeout>>();

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is required but was not set');
}
const redis: RedisClientType = createClient({ url: redisUrl });

redis.on('error', (err: unknown) => {
  console.error('Redis client error', err);
});

redis.connect().catch((err: unknown) => {
  console.error('Failed to connect to Redis at', redisUrl, err);
});

const httpServer = createServer();
const io = new Server(httpServer, {
  // Allow all origins for now; tighten this later if needed
  cors: {
    origin: '*',
  },
});

function generateLobbyId(): LobbyId {
  let id: LobbyId;
  do {
    id = randomBytes(6).toString('hex');
  } while (lobbies.has(id));
  return id;
}

interface CreateLobbyAckPayload {
  lobbyId: LobbyId;
  hostId: ClientId;
  clientId: ClientId;
  participants: ParticipantInfo[];
  isRevealed: boolean;
}

interface JoinLobbySuccessPayload {
  ok: true;
  lobbyId: LobbyId;
  hostId: ClientId;
  clientId: ClientId;
  participants: ParticipantInfo[];
  isRevealed: boolean;
}

interface JoinLobbyErrorPayload {
  ok: false;
  error: string;
}

type JoinLobbyAckPayload = JoinLobbySuccessPayload | JoinLobbyErrorPayload;

interface VoteSuccessPayload {
  ok: true;
}

interface VoteErrorPayload {
  ok: false;
  error: string;
}

type VoteAckPayload = VoteSuccessPayload | VoteErrorPayload;

interface RevealSuccessPayload {
  ok: true;
}

interface RevealErrorPayload {
  ok: false;
  error: string;
}

type RevealAckPayload = RevealSuccessPayload | RevealErrorPayload;

interface ResetSuccessPayload {
  ok: true;
}

interface ResetErrorPayload {
  ok: false;
  error: string;
}

type ResetAckPayload = ResetSuccessPayload | ResetErrorPayload;

interface StoredLobby {
  id: LobbyId;
  hostId: ClientId;
  participants: ParticipantInfo[];
  isRevealed: boolean;
}

const LOBBY_KEY_PREFIX = 'lobby:';

function lobbyKey(id: LobbyId): string {
  return `${LOBBY_KEY_PREFIX}${id}`;
}
function normalizeName(name?: string): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'Anonymous';
}

function serializeParticipants(lobby: Lobby): ParticipantInfo[] {
  return Array.from(lobby.participants.values());
}

function toStoredLobby(lobby: Lobby): StoredLobby {
  return {
    id: lobby.id,
    hostId: lobby.hostId,
    isRevealed: lobby.isRevealed,
    participants: serializeParticipants(lobby),
  };
}

function fromStoredLobby(stored: StoredLobby): Lobby {
  return {
    id: stored.id,
    hostId: stored.hostId,
    isRevealed: stored.isRevealed,
    participants: new Map<ClientId, ParticipantInfo>(
      stored.participants.map((p) => [p.clientId, p])
    ),
  };
}

async function saveLobby(lobby: Lobby): Promise<void> {
  const stored = toStoredLobby(lobby);
  const key = lobbyKey(lobby.id);
  await redis.set(key, JSON.stringify(stored));
  // Refresh TTL on every write so lobbies expire after 24h of inactivity.
  await redis.expire(key, 60 * 60 * 24);
}

async function loadLobby(lobbyId: LobbyId): Promise<Lobby | null> {
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

async function handleCreateLobby(
  socket: Socket,
  data: { name?: string } | undefined,
  ack?: (payload: CreateLobbyAckPayload) => void
) {
  const lobbyId = generateLobbyId();
  const hostId: ClientId = randomUUID() as ClientId;
  const hostName = normalizeName(data?.name);

  const lobby: Lobby = {
    id: lobbyId,
    hostId,
    participants: new Map<ClientId, ParticipantInfo>([
      [
        hostId,
        {
          clientId: hostId,
          name: hostName,
          isAdmin: true,
        },
      ],
    ]),
    isRevealed: false,
  };

  lobbies.set(lobbyId, lobby);
  // If there was a scheduled removal (e.g. lobby briefly empty), cancel it.
  const pendingRemoval = lobbyRemovalTimers.get(lobbyId);
  if (pendingRemoval) {
    clearTimeout(pendingRemoval);
    lobbyRemovalTimers.delete(lobbyId);
  }
  await saveLobby(lobby);

  // Join the socket.io room for this lobby so future events can be room-scoped
  socket.join(lobbyId);
  connections.set(socket.id, { lobbyId, clientId: hostId });

  const payload: CreateLobbyAckPayload = {
    lobbyId,
    hostId,
    clientId: hostId,
    participants: serializeParticipants(lobby),
    isRevealed: lobby.isRevealed,
  };

  // Notify the caller via ack (recommended pattern for request/response)
  if (typeof ack === 'function') {
    ack(payload);
  }

  // Also emit an event back to the creator in case they prefer event-style API
  socket.emit('lobby:created', payload);
}

async function handleJoinLobby(
  socket: Socket,
  lobbyId: LobbyId,
  name: string | undefined,
  existingClientId: ClientId | undefined,
  ack?: (payload: JoinLobbyAckPayload) => void
) {
  const lobby = await loadLobby(lobbyId);
  if (!lobby) {
    if (ack) {
      ack({ ok: false, error: 'Lobby not found' });
    }
    return;
  }

  const displayName = normalizeName(name);
  let clientId: ClientId;
  let isNewParticipant = false;

  if (existingClientId && lobby.participants.has(existingClientId)) {
    // Rejoin existing participant; update name if provided.
    clientId = existingClientId;
    const existing = lobby.participants.get(clientId);
    if (!existing) {
      // Fallback: treat as new participant if the stored id is inconsistent.
      clientId = randomUUID() as ClientId;
      lobby.participants.set(clientId, {
        clientId,
        name: displayName,
        isAdmin: false,
      });
      isNewParticipant = true;
    } else {
      lobby.participants.set(clientId, {
        ...existing,
        name: displayName,
      });
    }
  } else {
    // New participant in this lobby
    clientId = randomUUID() as ClientId;
    lobby.participants.set(clientId, {
      clientId,
      name: displayName,
      isAdmin: false,
    });
    isNewParticipant = true;
  }

  // Join the socket.io room for this lobby so messages can be scoped per lobby
  socket.join(lobbyId);
  connections.set(socket.id, { lobbyId, clientId });

  const payload: JoinLobbySuccessPayload = {
    ok: true,
    lobbyId: lobby.id,
    hostId: lobby.hostId,
    clientId,
    participants: serializeParticipants(lobby),
    isRevealed: lobby.isRevealed,
  };

  if (ack) {
    ack(payload);
  }

  // Notify all participants (including the new one) that someone joined.
  if (isNewParticipant) {
    io.to(lobbyId).emit('lobby:participant-joined', {
      lobbyId: lobby.id,
      clientId,
      name: displayName,
    });
  }
  await saveLobby(lobby);
}

async function handleVote(
  socket: Socket,
  data: { lobbyId?: LobbyId; card: PlanningPokerCard | null },
  ack?: (payload: VoteAckPayload) => void
) {
  const lobbyId = data.lobbyId;
  if (!lobbyId) {
    if (ack) {
      ack({ ok: false, error: 'Missing lobbyId' });
    }
    return;
  }

  const lobby = await loadLobby(lobbyId);
  if (!lobby) {
    if (ack) {
      ack({ ok: false, error: 'Lobby not found' });
    }
    return;
  }

  const conn = connections.get(socket.id);
  if (!conn || conn.lobbyId !== lobbyId) {
    if (ack) {
      ack({ ok: false, error: 'Not a participant in this lobby' });
    }
    return;
  }

  const clientId = conn.clientId;
  const participant = lobby.participants.get(clientId);
  if (!participant) {
    if (ack) {
      ack({ ok: false, error: 'Not a participant in this lobby' });
    }
    return;
  }

  participant.vote = data.card ?? undefined;

  const eventPayload = {
    lobbyId,
    clientId,
    card: data.card,
  };

  io.to(lobbyId).emit('lobby:voted', eventPayload);

  if (ack) {
    ack({ ok: true });
  }
  await saveLobby(lobby);
}

async function handleReveal(
  socket: Socket,
  data: { lobbyId?: LobbyId },
  ack?: (payload: RevealAckPayload) => void
) {
  const lobbyId = data.lobbyId;
  if (!lobbyId) {
    if (ack) {
      ack({ ok: false, error: 'Missing lobbyId' });
    }
    return;
  }

  const lobby = await loadLobby(lobbyId);
  if (!lobby) {
    if (ack) {
      ack({ ok: false, error: 'Lobby not found' });
    }
    return;
  }

  const conn = connections.get(socket.id);
  const clientId: ClientId | undefined = conn?.clientId;
  if (!clientId || clientId !== lobby.hostId) {
    if (ack) {
      ack({ ok: false, error: 'Only the lobby owner can reveal votes' });
    }
    return;
  }

  if (lobby.isRevealed) {
    if (ack) {
      ack({ ok: true });
    }
    return;
  }

  lobby.isRevealed = true;
  io.to(lobbyId).emit('lobby:revealed', { lobbyId });

  if (ack) {
    ack({ ok: true });
  }
  await saveLobby(lobby);
}

async function handleReset(
  socket: Socket,
  data: { lobbyId?: LobbyId },
  ack?: (payload: ResetAckPayload) => void
) {
  const lobbyId = data.lobbyId;
  if (!lobbyId) {
    if (ack) {
      ack({ ok: false, error: 'Missing lobbyId' });
    }
    return;
  }

  const lobby = await loadLobby(lobbyId);
  if (!lobby) {
    if (ack) {
      ack({ ok: false, error: 'Lobby not found' });
    }
    return;
  }

  const conn = connections.get(socket.id);
  const clientId: ClientId | undefined = conn?.clientId;
  if (!clientId || clientId !== lobby.hostId) {
    if (ack) {
      ack({ ok: false, error: 'Only the lobby owner can reset the lobby' });
    }
    return;
  }

  // Clear all votes and hide them again.
  for (const participant of lobby.participants.values()) {
    participant.vote = undefined;
  }
  lobby.isRevealed = false;

  io.to(lobbyId).emit('lobby:reset', { lobbyId });

  if (ack) {
    ack({ ok: true });
  }
  await saveLobby(lobby);
}

io.on('connection', (socket) => {
  console.log('client connected', socket.id);
  socket.on('disconnect', () => {
    const conn = connections.get(socket.id);
    if (conn) {
      connections.delete(socket.id);
      const stillHasConnections = Array.from(connections.values()).some(
        (c) => c.lobbyId === conn.lobbyId
      );
      if (!stillHasConnections) {
        // Schedule lobby removal after a grace period, so a single user
        // refreshing the page doesn't immediately delete the lobby.
        const existingTimer = lobbyRemovalTimers.get(conn.lobbyId);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }
        const timeout = setTimeout(() => {
          const hasReturnedConnections = Array.from(connections.values()).some(
            (c) => c.lobbyId === conn.lobbyId
          );
          if (!hasReturnedConnections) {
            lobbies.delete(conn.lobbyId);
            void redis.del(lobbyKey(conn.lobbyId));
          }
          lobbyRemovalTimers.delete(conn.lobbyId);
        }, 5 * 60 * 1000); // 5 minutes
        lobbyRemovalTimers.set(conn.lobbyId, timeout);
      }
    }
  });

  // Client should emit:
  //   socket.emit('lobby:create', { name }, (response) => { ... })
  socket.on(
    'lobby:create',
    (
      data: { name?: string } | undefined,
      ack?: (payload: CreateLobbyAckPayload) => void
    ) => {
      void handleCreateLobby(socket, data, ack);
    }
  );

  // Client should emit:
  //   socket.emit('lobby:join', { lobbyId, name }, (response) => { ... })
  socket.on(
    'lobby:join',
    (
      data: { lobbyId?: LobbyId; name?: string; clientId?: ClientId },
      ack?: (payload: JoinLobbyAckPayload) => void
    ) => {
      const lobbyId = data?.lobbyId;
      if (!lobbyId) {
        if (ack) {
          ack({ ok: false, error: 'Missing lobbyId' });
        }
        return;
      }
      void handleJoinLobby(socket, lobbyId, data?.name, data?.clientId, ack);
    }
  );

  // Client may emit:
  //   socket.emit('lobby:exists', { lobbyId }, (response) => { ok: boolean })
  socket.on(
    'lobby:exists',
    async (
      data: { lobbyId?: LobbyId },
      ack?: (payload: { ok: boolean }) => void
    ) => {
      if (!ack) return;
      const lobbyId = data?.lobbyId;
      if (!lobbyId) {
        ack({ ok: false });
        return;
      }
      const lobby = await loadLobby(lobbyId);
      ack({ ok: Boolean(lobby) });
    }
  );

  // Client should emit:
  //   socket.emit('lobby:vote', { lobbyId, card }, (response) => { ... })
  socket.on(
    'lobby:vote',
    (
      data: { lobbyId?: LobbyId; card: PlanningPokerCard | null },
      ack?: (payload: VoteAckPayload) => void
    ) => {
      void handleVote(socket, data, ack);
    }
  );

  // Client should emit:
  //   socket.emit('lobby:reveal', { lobbyId }, (response) => { ... })
  socket.on(
    'lobby:reveal',
    (data: { lobbyId?: LobbyId }, ack?: (payload: RevealAckPayload) => void) =>
      void handleReveal(socket, data, ack)
  );

  // Client should emit:
  //   socket.emit('lobby:reset', { lobbyId }, (response) => { ... })
  socket.on(
    'lobby:reset',
    (data: { lobbyId?: LobbyId }, ack?: (payload: ResetAckPayload) => void) =>
      void handleReset(socket, data, ack)
  );
});

const PORT = Number(process.env.PORT ?? 3002);
httpServer.listen(PORT, () => {
  console.log(`Socket.io server listening on port ${PORT}`);
});
