import type { Server, Socket } from 'socket.io';
import type { ClientId, LobbyId } from 'shared-types';
import type { Lobby, ResetAckPayload } from '../types.js';
import { handleReset } from './reset.js';

const LOBBY_ID = 'lobby-1' as LobbyId;
const HOST_ID = 'host-1' as ClientId;

const { connections, loadLobby, saveLobby } = vi.hoisted(() => {
  return {
    connections: new Map<string, { lobbyId: LobbyId; clientId: ClientId }>(),
    loadLobby: vi.fn<() => Promise<Lobby | null>>(),
    saveLobby: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  };
});

vi.mock('../LobbyService.js', () => ({
  connections,
  loadLobby,
  saveLobby,
}));

const emit = vi.fn();
const io = { to: vi.fn().mockReturnValue({ emit }) } as unknown as Server;
const socket = {
  id: 'socket-1',
  handshake: { address: '127.0.0.1' },
} as unknown as Socket;

function makeLobby(overrides: Partial<Lobby> = {}): Lobby {
  const PLAYER_ID = 'player-1' as ClientId;
  return {
    id: LOBBY_ID,
    hostId: HOST_ID,
    participants: new Map([
      [HOST_ID, { clientId: HOST_ID, name: 'Alice', isAdmin: true, vote: '5' as any }],
      [PLAYER_ID, { clientId: PLAYER_ID, name: 'Bob', isAdmin: false, vote: '8' as any }],
    ]),
    isRevealed: true,
    ...overrides,
  };
}

describe('handleReset', () => {
  beforeEach(() => {
    connections.clear();
    vi.clearAllMocks();
  });

  it('clears all votes, sets isRevealed to false, emits lobby:reset, and saves', async () => {
    const lobby = makeLobby();
    loadLobby.mockResolvedValue(lobby);
    connections.set('socket-1', { lobbyId: LOBBY_ID, clientId: HOST_ID });

    const ack = vi.fn<(p: ResetAckPayload) => void>();
    await handleReset(io, socket, { lobbyId: LOBBY_ID }, ack);

    // All votes cleared
    for (const participant of lobby.participants.values()) {
      expect(participant.vote).toBeUndefined();
    }

    expect(lobby.isRevealed).toBe(false);
    expect(io.to).toHaveBeenCalledWith(LOBBY_ID);
    expect(emit).toHaveBeenCalledWith('lobby:reset', { lobbyId: LOBBY_ID });
    expect(ack).toHaveBeenCalledWith({ ok: true });
    expect(saveLobby).toHaveBeenCalledWith(lobby);
  });

  it('rejects non-host with an error', async () => {
    const NON_HOST = 'client-other' as ClientId;
    const lobby = makeLobby();
    loadLobby.mockResolvedValue(lobby);
    connections.set('socket-1', { lobbyId: LOBBY_ID, clientId: NON_HOST });

    const ack = vi.fn<(p: ResetAckPayload) => void>();
    await handleReset(io, socket, { lobbyId: LOBBY_ID }, ack);

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: 'Only the lobby owner can reset the lobby',
    });
    expect(emit).not.toHaveBeenCalled();
    expect(saveLobby).not.toHaveBeenCalled();
  });

  it('acks with error when lobbyId is missing', async () => {
    const ack = vi.fn<(p: ResetAckPayload) => void>();
    await handleReset(io, socket, {}, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Missing lobbyId' });
    expect(loadLobby).not.toHaveBeenCalled();
  });

  it('acks with error when lobby is not found', async () => {
    loadLobby.mockResolvedValue(null);

    const ack = vi.fn<(p: ResetAckPayload) => void>();
    await handleReset(io, socket, { lobbyId: LOBBY_ID }, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Lobby not found' });
    expect(saveLobby).not.toHaveBeenCalled();
  });

  it('succeeds without error when host resets and no ack', async () => {
    const lobby = makeLobby();
    loadLobby.mockResolvedValue(lobby);
    connections.set('socket-1', { lobbyId: LOBBY_ID, clientId: HOST_ID });
    await expect(handleReset(io, socket, { lobbyId: LOBBY_ID })).resolves.toBeUndefined();
    expect(saveLobby).toHaveBeenCalledWith(lobby);
  });

  it('does not throw when lobbyId is missing and no ack', async () => {
    await expect(handleReset(io, socket, {})).resolves.toBeUndefined();
  });

  it('does not throw when lobby not found and no ack', async () => {
    loadLobby.mockResolvedValue(null);
    await expect(handleReset(io, socket, { lobbyId: LOBBY_ID })).resolves.toBeUndefined();
  });

  it('does not throw when non-host resets and no ack', async () => {
    loadLobby.mockResolvedValue(makeLobby());
    connections.set('socket-1', { lobbyId: LOBBY_ID, clientId: 'other' as ClientId });
    await expect(handleReset(io, socket, { lobbyId: LOBBY_ID })).resolves.toBeUndefined();
  });
});
