import type { Server, Socket } from 'socket.io';
import type { LobbyId, PlanningPokerCard } from 'shared-types';
import { connections, loadLobby, saveLobby } from '../LobbyService.js';
import type { VoteAckPayload } from '../types.js';

export async function handleVote(
  io: Server,
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

