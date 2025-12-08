import { randomUUID } from 'crypto';
import type { Socket } from 'socket.io';
import type { ClientId } from 'shared-types';
import {
  connections,
  generateLobbyId,
  lobbies,
  lobbyRemovalTimers,
  saveLobby,
} from '../LobbyService.js';
import type { CreateLobbyAckPayload, Lobby, ParticipantInfo } from '../types.js';
import { normalizeName, serializeParticipants } from '../utils.js';
import { appEvents, LOBBY_CREATED } from '../events/events.js';

export async function handleCreateLobby(
  socket: Socket,
  data: { name?: string } | undefined,
  ack?: (payload: CreateLobbyAckPayload) => void
) {
  const lobbyId = generateLobbyId();
  const hostId: ClientId = randomUUID() as ClientId;
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
  // If there was a scheduled removal (e.g. lobby briefly empty), cancel it.
  const pendingRemoval = lobbyRemovalTimers.get(lobbyId);
  if (pendingRemoval) {
    clearTimeout(pendingRemoval);
    lobbyRemovalTimers.delete(lobbyId);
  }
  await saveLobby(lobby);

  // Emit internal event for stats tracking
  appEvents.emit(LOBBY_CREATED, {
    lobbyId,
    timestamp: Date.now(),
  });

  // Join the socket.io room for this lobby so future events can be room-scoped
  socket.join(lobbyId);
  connections.set(socket.id, { lobbyId, clientId: hostId });

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

