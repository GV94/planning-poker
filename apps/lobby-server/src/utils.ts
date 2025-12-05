import type { ClientId } from 'shared-types';
import type { Lobby, ParticipantInfo, StoredLobby } from './types.js';

export function normalizeName(name?: string): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'Anonymous';
}

export function serializeParticipants(lobby: Lobby): ParticipantInfo[] {
  return Array.from(lobby.participants.values());
}

export function toStoredLobby(lobby: Lobby): StoredLobby {
  return {
    id: lobby.id,
    hostId: lobby.hostId,
    isRevealed: lobby.isRevealed,
    participants: serializeParticipants(lobby),
  };
}

export function fromStoredLobby(stored: StoredLobby): Lobby {
  return {
    id: stored.id,
    hostId: stored.hostId,
    isRevealed: stored.isRevealed,
    participants: new Map<ClientId, ParticipantInfo>(
      stored.participants.map((p) => [p.clientId, p])
    ),
  };
}

