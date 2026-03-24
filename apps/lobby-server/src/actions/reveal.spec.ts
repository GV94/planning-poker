import type { Server, Socket } from 'socket.io';
import type { ClientId, LobbyId } from 'shared-types';
import type { Lobby, RevealAckPayload } from '../types.js';
import { handleReveal } from './reveal.js';

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
  return {
    id: LOBBY_ID,
    hostId: HOST_ID,
    participants: new Map([
      [HOST_ID, { clientId: HOST_ID, name: 'Alice', isAdmin: true }],
    ]),
    isRevealed: false,
    ...overrides,
  };
}

describe('handleReveal', () => {
  beforeEach(() => {
    connections.clear();
    vi.clearAllMocks();
  });

  it('sets isRevealed to true, emits lobby:revealed, and saves lobby', async () => {
    const lobby = makeLobby();
    loadLobby.mockResolvedValue(lobby);
    connections.set('socket-1', { lobbyId: LOBBY_ID, clientId: HOST_ID });

    const ack = vi.fn<(p: RevealAckPayload) => void>();
    await handleReveal(io, socket, { lobbyId: LOBBY_ID }, ack);

    expect(lobby.isRevealed).toBe(true);
    expect(io.to).toHaveBeenCalledWith(LOBBY_ID);
    expect(emit).toHaveBeenCalledWith('lobby:revealed', { lobbyId: LOBBY_ID });
    expect(ack).toHaveBeenCalledWith({ ok: true });
    expect(saveLobby).toHaveBeenCalledWith(lobby);
  });

  it('rejects non-host with an error', async () => {
    const NON_HOST = 'client-other' as ClientId;
    const lobby = makeLobby();
    loadLobby.mockResolvedValue(lobby);
    connections.set('socket-1', { lobbyId: LOBBY_ID, clientId: NON_HOST });

    const ack = vi.fn<(p: RevealAckPayload) => void>();
    await handleReveal(io, socket, { lobbyId: LOBBY_ID }, ack);

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: 'Only the lobby owner can reveal votes',
    });
    expect(emit).not.toHaveBeenCalled();
    expect(saveLobby).not.toHaveBeenCalled();
  });

  it('acks ok but does not emit or save when already revealed', async () => {
    const lobby = makeLobby({ isRevealed: true });
    loadLobby.mockResolvedValue(lobby);
    connections.set('socket-1', { lobbyId: LOBBY_ID, clientId: HOST_ID });

    const ack = vi.fn<(p: RevealAckPayload) => void>();
    await handleReveal(io, socket, { lobbyId: LOBBY_ID }, ack);

    expect(ack).toHaveBeenCalledWith({ ok: true });
    expect(emit).not.toHaveBeenCalled();
    expect(saveLobby).not.toHaveBeenCalled();
  });

  it('acks with error when lobbyId is missing', async () => {
    const ack = vi.fn<(p: RevealAckPayload) => void>();
    await handleReveal(io, socket, {}, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Missing lobbyId' });
    expect(loadLobby).not.toHaveBeenCalled();
  });

  it('acks with error when lobby is not found', async () => {
    loadLobby.mockResolvedValue(null);

    const ack = vi.fn<(p: RevealAckPayload) => void>();
    await handleReveal(io, socket, { lobbyId: LOBBY_ID }, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Lobby not found' });
    expect(saveLobby).not.toHaveBeenCalled();
  });

  it('succeeds without error when host reveals and no ack', async () => {
    const lobby = makeLobby();
    loadLobby.mockResolvedValue(lobby);
    connections.set('socket-1', { lobbyId: LOBBY_ID, clientId: HOST_ID });
    await expect(handleReveal(io, socket, { lobbyId: LOBBY_ID })).resolves.toBeUndefined();
    expect(lobby.isRevealed).toBe(true);
    expect(saveLobby).toHaveBeenCalledWith(lobby);
  });

  it('does not throw when lobbyId is missing and no ack', async () => {
    await expect(handleReveal(io, socket, {})).resolves.toBeUndefined();
  });

  it('does not throw when lobby not found and no ack', async () => {
    loadLobby.mockResolvedValue(null);
    await expect(handleReveal(io, socket, { lobbyId: LOBBY_ID })).resolves.toBeUndefined();
  });

  it('does not throw when non-host reveals and no ack', async () => {
    loadLobby.mockResolvedValue(makeLobby());
    connections.set('socket-1', { lobbyId: LOBBY_ID, clientId: 'other' as ClientId });
    await expect(handleReveal(io, socket, { lobbyId: LOBBY_ID })).resolves.toBeUndefined();
  });

  it('does not throw when already revealed and no ack', async () => {
    loadLobby.mockResolvedValue(makeLobby({ isRevealed: true }));
    connections.set('socket-1', { lobbyId: LOBBY_ID, clientId: HOST_ID });
    await expect(handleReveal(io, socket, { lobbyId: LOBBY_ID })).resolves.toBeUndefined();
  });
});
