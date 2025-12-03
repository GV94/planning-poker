import { createServer } from 'http';
import { randomUUID } from 'crypto';
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
function normalizeName(name?: string): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'Anonymous';
}

function serializeParticipants(lobby: Lobby): ParticipantInfo[] {
  return Array.from(lobby.participants.values());
}

function handleCreateLobby(
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

function handleJoinLobby(
  socket: Socket,
  lobbyId: LobbyId,
  name: string | undefined,
  ack?: (payload: JoinLobbyAckPayload) => void
) {
  const lobby = lobbies.get(lobbyId);
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
}

function handleVote(
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

  const lobby = lobbies.get(lobbyId);
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

function handleReveal(
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

  const lobby = lobbies.get(lobbyId);
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
      handleCreateLobby(socket, data, ack);
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
      handleJoinLobby(socket, lobbyId, data?.name, ack);
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
      handleVote(socket, data, ack);
    }
  );

  // Client should emit:
  //   socket.emit('lobby:reveal', { lobbyId }, (response) => { ... })
  socket.on(
    'lobby:reveal',
    (data: { lobbyId?: LobbyId }, ack?: (payload: RevealAckPayload) => void) =>
      handleReveal(socket, data, ack)
  );
});

const PORT = Number(process.env.PORT ?? 3002);
httpServer.listen(PORT, () => {
  console.log(`Socket.io server listening on port ${PORT}`);
});
