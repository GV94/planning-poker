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

io.on('connection', (socket) => {
  console.log('client connected', socket.id);

  // Client should emit: socket.emit('lobby:create', (response) => { ... })
  socket.on('lobby:create', (ack) => {
    handleCreateLobby(socket, ack);
  });
});

const PORT = Number(process.env.PORT ?? 3002);
httpServer.listen(PORT, () => {
  console.log(`Socket.io server listening on port ${PORT}`);
});
