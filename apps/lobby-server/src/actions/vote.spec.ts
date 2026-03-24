import type { Server, Socket } from 'socket.io';
import type { ClientId, LobbyId } from 'shared-types';
import type { Lobby, VoteAckPayload } from '../types.js';
import { handleVote } from './vote.js';

const LOBBY_ID = 'lobby-1' as LobbyId;
const CLIENT_ID = 'client-1' as ClientId;

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
    hostId: CLIENT_ID,
    participants: new Map([
      [CLIENT_ID, { clientId: CLIENT_ID, name: 'Alice', isAdmin: true }],
    ]),
    isRevealed: false,
    ...overrides,
  };
}

describe('handleVote', () => {
  beforeEach(() => {
    connections.clear();
    vi.clearAllMocks();
  });

  it('records a vote and emits lobby:voted', async () => {
    const lobby = makeLobby();
    loadLobby.mockResolvedValue(lobby);
    connections.set('socket-1', { lobbyId: LOBBY_ID, clientId: CLIENT_ID });

    const ack = vi.fn<(p: VoteAckPayload) => void>();
    await handleVote(io, socket, { lobbyId: LOBBY_ID, card: '5' }, ack);

    expect(lobby.participants.get(CLIENT_ID)!.vote).toBe('5');
    expect(io.to).toHaveBeenCalledWith(LOBBY_ID);
    expect(emit).toHaveBeenCalledWith('lobby:voted', {
      lobbyId: LOBBY_ID,
      clientId: CLIENT_ID,
      card: '5',
    });
    expect(ack).toHaveBeenCalledWith({ ok: true });
    expect(saveLobby).toHaveBeenCalledWith(lobby);
  });

  it('clears vote when card is null', async () => {
    const lobby = makeLobby();
    lobby.participants.get(CLIENT_ID)!.vote = '8';
    loadLobby.mockResolvedValue(lobby);
    connections.set('socket-1', { lobbyId: LOBBY_ID, clientId: CLIENT_ID });

    const ack = vi.fn<(p: VoteAckPayload) => void>();
    await handleVote(io, socket, { lobbyId: LOBBY_ID, card: null }, ack);

    expect(lobby.participants.get(CLIENT_ID)!.vote).toBeUndefined();
    expect(emit).toHaveBeenCalledWith('lobby:voted', {
      lobbyId: LOBBY_ID,
      clientId: CLIENT_ID,
      card: null,
    });
    expect(ack).toHaveBeenCalledWith({ ok: true });
    expect(saveLobby).toHaveBeenCalledWith(lobby);
  });

  it('acks with error when lobbyId is missing', async () => {
    const ack = vi.fn<(p: VoteAckPayload) => void>();
    await handleVote(io, socket, { card: '3' }, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Missing lobbyId' });
    expect(loadLobby).not.toHaveBeenCalled();
  });

  it('acks with error when lobby is not found', async () => {
    loadLobby.mockResolvedValue(null);

    const ack = vi.fn<(p: VoteAckPayload) => void>();
    await handleVote(io, socket, { lobbyId: LOBBY_ID, card: '3' }, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Lobby not found' });
    expect(saveLobby).not.toHaveBeenCalled();
  });

  it('acks with error when socket is not connected to the lobby', async () => {
    loadLobby.mockResolvedValue(makeLobby());
    // connections map has no entry for socket-1

    const ack = vi.fn<(p: VoteAckPayload) => void>();
    await handleVote(io, socket, { lobbyId: LOBBY_ID, card: '3' }, ack);

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: 'Not a participant in this lobby',
    });
    expect(saveLobby).not.toHaveBeenCalled();
  });

  it('acks with error when participant is not found in lobby', async () => {
    const OTHER_CLIENT = 'client-other' as ClientId;
    const lobby = makeLobby();
    // Connection maps to a clientId that is not in the lobby participants
    loadLobby.mockResolvedValue(lobby);
    connections.set('socket-1', { lobbyId: LOBBY_ID, clientId: OTHER_CLIENT });

    const ack = vi.fn<(p: VoteAckPayload) => void>();
    await handleVote(io, socket, { lobbyId: LOBBY_ID, card: '3' }, ack);

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: 'Not a participant in this lobby',
    });
    expect(saveLobby).not.toHaveBeenCalled();
  });

  it('does not throw when lobbyId is missing and no ack is provided', async () => {
    await expect(handleVote(io, socket, { card: '3' })).resolves.toBeUndefined();
  });

  it('does not throw when lobby is not found and no ack is provided', async () => {
    loadLobby.mockResolvedValue(null);
    await expect(handleVote(io, socket, { lobbyId: LOBBY_ID, card: '3' })).resolves.toBeUndefined();
  });

  it('does not throw when socket is not connected and no ack is provided', async () => {
    loadLobby.mockResolvedValue(makeLobby());
    await expect(handleVote(io, socket, { lobbyId: LOBBY_ID, card: '3' })).resolves.toBeUndefined();
  });

  it('does not throw when participant is not in lobby and no ack is provided', async () => {
    loadLobby.mockResolvedValue(makeLobby());
    connections.set('socket-1', { lobbyId: LOBBY_ID, clientId: 'other' as ClientId });
    await expect(handleVote(io, socket, { lobbyId: LOBBY_ID, card: '3' })).resolves.toBeUndefined();
  });

  it('completes without error when no ack callback is provided', async () => {
    const lobby = makeLobby();
    loadLobby.mockResolvedValue(lobby);
    connections.set('socket-1', { lobbyId: LOBBY_ID, clientId: CLIENT_ID });

    await handleVote(io, socket, { lobbyId: LOBBY_ID, card: '13' });

    expect(lobby.participants.get(CLIENT_ID)!.vote).toBe('13');
    expect(emit).toHaveBeenCalledWith('lobby:voted', {
      lobbyId: LOBBY_ID,
      clientId: CLIENT_ID,
      card: '13',
    });
    expect(saveLobby).toHaveBeenCalledWith(lobby);
  });
});
