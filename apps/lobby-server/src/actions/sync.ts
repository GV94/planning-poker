import type { Server, Socket } from 'socket.io';
import type { LobbyId } from 'shared-types';
import { loadLobby } from '../LobbyService.js';
import type { SyncLobbyAckPayload } from '../types.js';
import { serializeParticipants } from '../utils.js';

export async function handleSync(
  io: Server,
  socket: Socket,
  data: { lobbyId?: LobbyId },
  ack?: (payload: SyncLobbyAckPayload) => void
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

  // We can also rejoin the socket to the room if it was missing,
  // though usually reconnection handles that.
  socket.join(lobbyId);

  if (ack) {
    ack({
      ok: true,
      lobbyId: lobby.id,
      hostId: lobby.hostId,
      participants: serializeParticipants(lobby),
      isRevealed: lobby.isRevealed,
    });
  }
}

