import { randomUUID } from 'crypto';
import type { Server, Socket } from 'socket.io';
import type { ClientId, LobbyId } from 'shared-types';
import { connections, loadLobby, saveLobby } from '../LobbyService.js';
import type { JoinLobbyAckPayload, JoinLobbySuccessPayload } from '../types.js';
import { normalizeName, serializeParticipants } from '../utils.js';

export async function handleJoinLobby(
  io: Server,
  socket: Socket,
  lobbyId: LobbyId,
  name: string | undefined,
  existingClientId: ClientId | undefined,
  ack?: (payload: JoinLobbyAckPayload) => void
) {
  const lobby = await loadLobby(lobbyId);
  if (!lobby) {
    if (ack) {
      ack({ ok: false, error: 'Lobby not found' });
    }
    return;
  }

  const displayName = normalizeName(name);
  let clientId: ClientId;
  let isNewParticipant = false;

  if (existingClientId && lobby.participants.has(existingClientId)) {
    // Rejoin existing participant; update name if provided.
    clientId = existingClientId;
    const existing = lobby.participants.get(clientId);
    if (!existing) {
      // Fallback: treat as new participant if the stored id is inconsistent.
      clientId = randomUUID() as ClientId;
      lobby.participants.set(clientId, {
        clientId,
        name: displayName,
        isAdmin: false,
      });
      isNewParticipant = true;
    } else {
      lobby.participants.set(clientId, {
        ...existing,
        name: displayName,
      });
    }
  } else {
    // New participant in this lobby
    clientId = randomUUID() as ClientId;
    lobby.participants.set(clientId, {
      clientId,
      name: displayName,
      isAdmin: false,
    });
    isNewParticipant = true;
  }

  // Join the socket.io room for this lobby so messages can be scoped per lobby
  socket.join(lobbyId);
  connections.set(socket.id, { lobbyId, clientId });

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
  if (isNewParticipant) {
    io.to(lobbyId).emit('lobby:participant-joined', {
      lobbyId: lobby.id,
      clientId,
      name: displayName,
    });
  }
  await saveLobby(lobby);
}
