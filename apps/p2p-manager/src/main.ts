import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { Server, type Socket } from 'socket.io';

type LobbyId = string;
type ClientId = string;

interface Lobby {
  id: LobbyId;
  hostId: ClientId;
  participants: Set<ClientId>;
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
}

interface JoinLobbySuccessPayload {
  ok: true;
  lobbyId: LobbyId;
  hostId: ClientId;
  clientId: ClientId;
}

interface JoinLobbyErrorPayload {
  ok: false;
  error: string;
}

type JoinLobbyAckPayload = JoinLobbySuccessPayload | JoinLobbyErrorPayload;

function handleCreateLobby(
  socket: Socket,
  ack?: (payload: CreateLobbyAckPayload) => void
) {
  const lobbyId = generateLobbyId();
  const hostId: ClientId = socket.id;

  const lobby: Lobby = {
    id: lobbyId,
    hostId,
    participants: new Set<ClientId>([hostId]),
  };

  lobbies.set(lobbyId, lobby);

  // Join the socket.io room for this lobby so future events can be room-scoped
  socket.join(lobbyId);

  const payload = {
    lobbyId,
    hostId,
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
  lobby.participants.add(clientId);

  // Join the socket.io room for this lobby so messages can be scoped per lobby
  socket.join(lobbyId);

  const payload: JoinLobbySuccessPayload = {
    ok: true,
    lobbyId: lobby.id,
    hostId: lobby.hostId,
    clientId,
  };

  if (ack) {
    ack(payload);
  }

  // Notify all participants (including the new one) that someone joined.
  io.to(lobbyId).emit('lobby:participant-joined', {
    lobbyId: lobby.id,
    clientId,
  });
}

io.on('connection', (socket) => {
  console.log('client connected', socket.id);

  // Client should emit: socket.emit('lobby:create', (response) => { ... })
  socket.on('lobby:create', (ack) => {
    handleCreateLobby(socket, ack);
  });

  // Client should emit:
  //   socket.emit('lobby:join', { lobbyId }, (response) => { ... })
  socket.on(
    'lobby:join',
    (
      data: { lobbyId?: LobbyId },
      ack?: (payload: JoinLobbyAckPayload) => void
    ) => {
      const lobbyId = data?.lobbyId;
      if (!lobbyId) {
        if (ack) {
          ack({ ok: false, error: 'Missing lobbyId' });
        }
        return;
      }
      handleJoinLobby(socket, lobbyId, ack);
    }
  );
});

const PORT = Number(process.env.PORT ?? 3002);
httpServer.listen(PORT, () => {
  console.log(`Socket.io server listening on port ${PORT}`);
});
