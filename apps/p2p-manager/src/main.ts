import { createServer } from 'http';
import { randomUUID } from 'crypto';
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

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
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
    id = randomUUID();
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
  await redis.set(lobbyKey(lobby.id), JSON.stringify(stored));
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
  const hostId: ClientId = socket.id;
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
  await saveLobby(lobby);

  // Join the socket.io room for this lobby so future events can be room-scoped
  socket.join(lobbyId);

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
  ack?: (payload: JoinLobbyAckPayload) => void
) {
  const lobby = await loadLobby(lobbyId);
  if (!lobby) {
    if (ack) {
      ack({ ok: false, error: 'Lobby not found' });
    }
    return;
  }

  const clientId: ClientId = socket.id;
  const displayName = normalizeName(name);
  lobby.participants.set(clientId, {
    clientId,
    name: displayName,
    isAdmin: false,
  });

  // Join the socket.io room for this lobby so messages can be scoped per lobby
  socket.join(lobbyId);

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
  io.to(lobbyId).emit('lobby:participant-joined', {
    lobbyId: lobby.id,
    clientId,
    name: displayName,
  });
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

  const clientId: ClientId = socket.id;
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

  const clientId: ClientId = socket.id;
  if (clientId !== lobby.hostId) {
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

  const clientId: ClientId = socket.id;
  if (clientId !== lobby.hostId) {
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
}

io.on('connection', (socket) => {
  console.log('client connected', socket.id);

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
      data: { lobbyId?: LobbyId; name?: string },
      ack?: (payload: JoinLobbyAckPayload) => void
    ) => {
      const lobbyId = data?.lobbyId;
      if (!lobbyId) {
        if (ack) {
          ack({ ok: false, error: 'Missing lobbyId' });
        }
        return;
      }
      void handleJoinLobby(socket, lobbyId, data?.name, ack);
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
