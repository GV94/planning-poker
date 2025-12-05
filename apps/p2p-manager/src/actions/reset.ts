import type { Server, Socket } from 'socket.io';
import type { ClientId, LobbyId } from 'shared-types';
import { connections, loadLobby, saveLobby } from '../LobbyService.js';
import type { ResetAckPayload } from '../types.js';

export async function handleReset(
  io: Server,
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

