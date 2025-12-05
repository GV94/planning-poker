import type { Server, Socket } from 'socket.io';
import type { ClientId, LobbyId } from 'shared-types';
import { connections, loadLobby, saveLobby } from '../LobbyService.js';
import type { RevealAckPayload } from '../types.js';

export async function handleReveal(
  io: Server,
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

