import type { Server, Socket } from 'socket.io';
import type { ClientId, LobbyId } from 'shared-types';
import { connections, loadLobby } from '../LobbyService.js';
import type { SyncLobbyAckPayload } from '../types.js';
import { serializeParticipants } from '../utils.js';

export async function handleSync(
  io: Server,
  socket: Socket,
  data: { lobbyId?: LobbyId; clientId?: ClientId },
  ack?: (payload: SyncLobbyAckPayload) => void
) {
  const lobbyId = data.lobbyId;
  const clientId = data.clientId;
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

  // Re-establish connection mapping if clientId is provided
  if (clientId) {
    // If the socket ID changed (reconnect) but clientId is valid and in the lobby,
    // update the mapping so the server knows who this socket is.
    if (lobby.participants.has(clientId)) {
      connections.set(socket.id, { lobbyId, clientId });
    }
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

