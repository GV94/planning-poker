import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ClientId, LobbyId, PlanningPokerCard } from 'shared-types';
import { handleCreateLobby } from './actions/create-lobby.js';
import { handleDisconnect } from './actions/disconnect.js';
import { handleExists } from './actions/exists.js';
import { handleJoinLobby } from './actions/join-lobby.js';
import { handleReset } from './actions/reset.js';
import { handleReveal } from './actions/reveal.js';
import { handleSync } from './actions/sync.js';
import { handleVote } from './actions/vote.js';
import type {
  CreateLobbyAckPayload,
  JoinLobbyAckPayload,
  ResetAckPayload,
  RevealAckPayload,
  SyncLobbyAckPayload,
  VoteAckPayload,
} from './types.js';

// Ensure store (and redis connection) is initialized
import './LobbyService.js';

const httpServer = createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ status: 'ok' }));
  }
});
const io = new Server(httpServer, {
  // Allow all origins for now; tighten this later if needed
  cors: {
    origin: process.env.CORS_ORIGIN ?? '*',
  },
});

io.on('connection', (socket) => {
  console.log('client connected', socket.id);
  socket.on('disconnect', () => {
    handleDisconnect(socket);
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
      void handleJoinLobby(
        io,
        socket,
        lobbyId,
        data?.name,
        data?.clientId,
        ack
      );
    }
  );

  // Client may emit:
  //   socket.emit('lobby:exists', { lobbyId }, (response) => { ok: boolean })
  socket.on(
    'lobby:exists',
    (data: { lobbyId?: LobbyId }, ack?: (payload: { ok: boolean }) => void) => {
      void handleExists(data, ack);
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
      void handleVote(io, socket, data, ack);
    }
  );

  // Client should emit:
  //   socket.emit('lobby:reveal', { lobbyId }, (response) => { ... })
  socket.on(
    'lobby:reveal',
    (data: { lobbyId?: LobbyId }, ack?: (payload: RevealAckPayload) => void) =>
      void handleReveal(io, socket, data, ack)
  );

  // Client should emit:
  //   socket.emit('lobby:reset', { lobbyId }, (response) => { ... })
  socket.on(
    'lobby:reset',
    (data: { lobbyId?: LobbyId }, ack?: (payload: ResetAckPayload) => void) =>
      void handleReset(io, socket, data, ack)
  );

  // Client should emit:
  //   socket.emit('lobby:sync', { lobbyId, clientId }, (response) => { ... })
  socket.on(
    'lobby:sync',
    (
      data: { lobbyId?: LobbyId; clientId?: ClientId },
      ack?: (payload: SyncLobbyAckPayload) => void
    ) => void handleSync(io, socket, data, ack)
  );
});

const PORT = Number(process.env.PORT ?? 3002);
httpServer.listen(PORT, () => {
  console.log(`Socket.io server listening on port ${PORT}`);
});
