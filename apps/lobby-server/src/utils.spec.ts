import type { ClientId, LobbyId } from 'shared-types';
import type { Lobby, ParticipantInfo, StoredLobby } from './types.js';
import {
  normalizeName,
  serializeParticipants,
  toStoredLobby,
  fromStoredLobby,
} from './utils.js';

describe('normalizeName', () => {
  it('returns a trimmed name when given a valid name with whitespace', () => {
    expect(normalizeName('  Alice  ')).toBe('Alice');
  });

  it('returns the name as-is when there is no surrounding whitespace', () => {
    expect(normalizeName('Bob')).toBe('Bob');
  });

  it('returns "Anonymous" for an empty string', () => {
    expect(normalizeName('')).toBe('Anonymous');
  });

  it('returns "Anonymous" when undefined is passed', () => {
    expect(normalizeName(undefined)).toBe('Anonymous');
  });

  it('returns "Anonymous" for a whitespace-only string', () => {
    expect(normalizeName('   ')).toBe('Anonymous');
  });

  it('returns "Anonymous" for a tab/newline-only string', () => {
    expect(normalizeName('\t\n')).toBe('Anonymous');
  });
});

function makeParticipant(
  clientId: string,
  name: string,
  overrides: Partial<ParticipantInfo> = {}
): ParticipantInfo {
  return {
    clientId: clientId as ClientId,
    name,
    isAdmin: false,
    ...overrides,
  };
}

function makeLobby(
  participants: ParticipantInfo[],
  overrides: Partial<Omit<Lobby, 'participants'>> = {}
): Lobby {
  return {
    id: 'lobby-1' as LobbyId,
    hostId: 'host-1' as ClientId,
    isRevealed: false,
    ...overrides,
    participants: new Map(participants.map((p) => [p.clientId, p])),
  };
}

describe('serializeParticipants', () => {
  it('returns an array of all participants from the map', () => {
    const p1 = makeParticipant('c1', 'Alice', { isAdmin: true });
    const p2 = makeParticipant('c2', 'Bob', { vote: 5 });
    const lobby = makeLobby([p1, p2]);

    const result = serializeParticipants(lobby);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(p1);
    expect(result).toContainEqual(p2);
  });

  it('returns an empty array when there are no participants', () => {
    const lobby = makeLobby([]);

    const result = serializeParticipants(lobby);

    expect(result).toEqual([]);
  });
});

describe('toStoredLobby', () => {
  it('converts a Lobby to a StoredLobby with participants as an array', () => {
    const p1 = makeParticipant('c1', 'Alice', { isAdmin: true });
    const p2 = makeParticipant('c2', 'Bob', { vote: 8 });
    const lobby = makeLobby([p1, p2], {
      id: 'lobby-42' as LobbyId,
      hostId: 'c1' as ClientId,
      isRevealed: true,
    });

    const stored = toStoredLobby(lobby);

    expect(stored.id).toBe('lobby-42');
    expect(stored.hostId).toBe('c1');
    expect(stored.isRevealed).toBe(true);
    expect(Array.isArray(stored.participants)).toBe(true);
    expect(stored.participants).toHaveLength(2);
    expect(stored.participants).toContainEqual(p1);
    expect(stored.participants).toContainEqual(p2);
  });

  it('produces an empty participants array for a lobby with no participants', () => {
    const lobby = makeLobby([]);

    const stored = toStoredLobby(lobby);

    expect(stored.participants).toEqual([]);
  });
});

describe('fromStoredLobby', () => {
  it('converts a StoredLobby back to a Lobby with a participants Map', () => {
    const p1 = makeParticipant('c1', 'Alice', { isAdmin: true });
    const p2 = makeParticipant('c2', 'Bob', { vote: 13 });
    const stored: StoredLobby = {
      id: 'lobby-99' as LobbyId,
      hostId: 'c1' as ClientId,
      isRevealed: false,
      participants: [p1, p2],
    };

    const lobby = fromStoredLobby(stored);

    expect(lobby.id).toBe('lobby-99');
    expect(lobby.hostId).toBe('c1');
    expect(lobby.isRevealed).toBe(false);
    expect(lobby.participants).toBeInstanceOf(Map);
    expect(lobby.participants.size).toBe(2);
  });

  it('keys the Map entries by each participant clientId', () => {
    const p1 = makeParticipant('c1', 'Alice');
    const p2 = makeParticipant('c2', 'Bob');
    const stored: StoredLobby = {
      id: 'lobby-1' as LobbyId,
      hostId: 'c1' as ClientId,
      isRevealed: false,
      participants: [p1, p2],
    };

    const lobby = fromStoredLobby(stored);

    expect(lobby.participants.get('c1' as ClientId)).toEqual(p1);
    expect(lobby.participants.get('c2' as ClientId)).toEqual(p2);
    expect(lobby.participants.has('nonexistent' as ClientId)).toBe(false);
  });

  it('produces an empty Map when stored participants is empty', () => {
    const stored: StoredLobby = {
      id: 'lobby-1' as LobbyId,
      hostId: 'host-1' as ClientId,
      isRevealed: false,
      participants: [],
    };

    const lobby = fromStoredLobby(stored);

    expect(lobby.participants).toBeInstanceOf(Map);
    expect(lobby.participants.size).toBe(0);
  });

  it('roundtrips correctly with toStoredLobby', () => {
    const p1 = makeParticipant('c1', 'Alice', { isAdmin: true, vote: 3 });
    const p2 = makeParticipant('c2', 'Bob', { vote: '?' });
    const original = makeLobby([p1, p2], {
      id: 'lobby-rt' as LobbyId,
      hostId: 'c1' as ClientId,
      isRevealed: true,
    });

    const restored = fromStoredLobby(toStoredLobby(original));

    expect(restored.id).toBe(original.id);
    expect(restored.hostId).toBe(original.hostId);
    expect(restored.isRevealed).toBe(original.isRevealed);
    expect(restored.participants.size).toBe(original.participants.size);
    for (const [key, value] of original.participants) {
      expect(restored.participants.get(key)).toEqual(value);
    }
  });
});
