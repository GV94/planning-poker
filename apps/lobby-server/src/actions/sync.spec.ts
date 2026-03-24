import type { ClientId, LobbyId } from 'shared-types';
import type { Lobby } from '../types.js';
import { handleSync } from './sync.js';

vi.mock('../LobbyService.js', () => ({
  connections: new Map(),
  loadLobby: vi.fn(),
}));

import { connections, loadLobby } from '../LobbyService.js';

const mockLoadLobby = loadLobby as ReturnType<typeof vi.fn>;

function makeLobby(overrides: Partial<Lobby> = {}): Lobby {
  const participants = new Map<ClientId, { clientId: ClientId; name: string; isAdmin: boolean }>();
  participants.set('client-1' as ClientId, {
    clientId: 'client-1' as ClientId,
    name: 'Alice',
    isAdmin: true,
  });
  return {
    id: 'lobby-1' as LobbyId,
    hostId: 'client-1' as ClientId,
    participants,
    isRevealed: false,
    ...overrides,
  };
}

describe('handleSync', () => {
  const io = {} as any;
  const socket = { id: 'socket-1', join: vi.fn() } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    connections.clear();
    socket.join.mockClear();
  });

  it('acks with lobby state and joins socket to room on successful sync', async () => {
    const lobby = makeLobby();
    mockLoadLobby.mockResolvedValue(lobby);
    const ack = vi.fn();

    await handleSync(io, socket, { lobbyId: 'lobby-1' as LobbyId }, ack);

    expect(socket.join).toHaveBeenCalledWith('lobby-1');
    expect(ack).toHaveBeenCalledWith({
      ok: true,
      lobbyId: 'lobby-1',
      hostId: 'client-1',
      participants: [{ clientId: 'client-1', name: 'Alice', isAdmin: true }],
      isRevealed: false,
    });
  });

  it('re-establishes connection mapping when clientId is a known participant', async () => {
    const lobby = makeLobby();
    mockLoadLobby.mockResolvedValue(lobby);
    const ack = vi.fn();

    await handleSync(
      io,
      socket,
      { lobbyId: 'lobby-1' as LobbyId, clientId: 'client-1' as ClientId },
      ack
    );

    expect(connections.get('socket-1')).toEqual({
      lobbyId: 'lobby-1',
      clientId: 'client-1',
    });
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('does not map connection when clientId is not in participants', async () => {
    const lobby = makeLobby();
    mockLoadLobby.mockResolvedValue(lobby);
    const ack = vi.fn();

    await handleSync(
      io,
      socket,
      { lobbyId: 'lobby-1' as LobbyId, clientId: 'unknown-client' as ClientId },
      ack
    );

    expect(connections.has('socket-1')).toBe(false);
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('acks with error when lobbyId is missing', async () => {
    const ack = vi.fn();

    await handleSync(io, socket, {}, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Missing lobbyId' });
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('acks with error when lobby is not found', async () => {
    mockLoadLobby.mockResolvedValue(null);
    const ack = vi.fn();

    await handleSync(io, socket, { lobbyId: 'nonexistent' as LobbyId }, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Lobby not found' });
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('returns without error when no ack callback is provided', async () => {
    mockLoadLobby.mockResolvedValue(makeLobby());

    await expect(
      handleSync(io, socket, { lobbyId: 'lobby-1' as LobbyId })
    ).resolves.toBeUndefined();

    expect(socket.join).toHaveBeenCalledWith('lobby-1');
  });

  it('returns without error when no ack and lobbyId is missing', async () => {
    await expect(handleSync(io, socket, {})).resolves.toBeUndefined();
  });

  it('returns without error when no ack and lobby not found', async () => {
    mockLoadLobby.mockResolvedValue(null);
    await expect(
      handleSync(io, socket, { lobbyId: 'x' as LobbyId })
    ).resolves.toBeUndefined();
  });
});
