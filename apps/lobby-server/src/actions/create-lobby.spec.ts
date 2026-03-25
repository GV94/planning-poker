import type { Socket } from 'socket.io';
import type { ClientId, LobbyId } from 'shared-types';
import { handleCreateLobby } from './create-lobby.js';

const FAKE_LOBBY_ID = 'abc123' as LobbyId;
const FAKE_HOST_ID = 'uuid-host-1' as ClientId;

const {
  lobbies,
  connections,
  lobbyRemovalTimers,
  generateLobbyId,
  saveLobby,
  verifyCaptcha,
  appEvents,
} = vi.hoisted(() => ({
  lobbies: new Map(),
  connections: new Map(),
  lobbyRemovalTimers: new Map(),
  generateLobbyId: vi.fn(),
  saveLobby: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  verifyCaptcha: vi.fn<() => Promise<boolean>>(),
  appEvents: { emit: vi.fn() },
}));

vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => FAKE_HOST_ID),
}));

vi.mock('../LobbyService.js', () => ({
  lobbies,
  connections,
  lobbyRemovalTimers,
  generateLobbyId,
  saveLobby,
}));

vi.mock('../captcha.js', () => ({
  verifyCaptcha,
}));

vi.mock('../events/events.js', () => ({
  appEvents,
  LOBBY_CREATED: 'lobby:created',
}));

function createMockSocket(): Socket {
  return {
    id: 'socket-1',
    join: vi.fn(),
    emit: vi.fn(),
    handshake: { address: '127.0.0.1' },
  } as unknown as Socket;
}

describe('handleCreateLobby', () => {
  let socket: Socket;

  beforeEach(() => {
    socket = createMockSocket();
    lobbies.clear();
    connections.clear();
    lobbyRemovalTimers.clear();
    vi.clearAllMocks();
    generateLobbyId.mockReturnValue(FAKE_LOBBY_ID);
    verifyCaptcha.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a lobby successfully when a name is provided', async () => {
    const ack = vi.fn();

    await handleCreateLobby(socket, { name: 'Alice', captchaToken: 'tok' }, ack);

    // Captcha was checked
    expect(verifyCaptcha).toHaveBeenCalledWith('tok', '127.0.0.1');

    // Lobby stored in the in-memory map
    expect(lobbies.size).toBe(1);
    const lobby = lobbies.get(FAKE_LOBBY_ID);
    expect(lobby).toBeDefined();
    expect(lobby.id).toBe(FAKE_LOBBY_ID);
    expect(lobby.hostId).toBe(FAKE_HOST_ID);
    expect(lobby.isRevealed).toBe(false);
    expect(lobby.participants.size).toBe(1);

    const host = lobby.participants.get(FAKE_HOST_ID);
    expect(host).toEqual({
      clientId: FAKE_HOST_ID,
      name: 'Alice',
      isAdmin: true,
    });

    // saveLobby was called with the lobby
    expect(saveLobby).toHaveBeenCalledWith(lobby);

    // appEvents.emit was called with LOBBY_CREATED
    expect(appEvents.emit).toHaveBeenCalledWith(
      'lobby:created',
      expect.objectContaining({
        lobbyId: FAKE_LOBBY_ID,
        timestamp: expect.any(Number),
      })
    );

    // Socket joined the lobby room
    expect(socket.join).toHaveBeenCalledWith(FAKE_LOBBY_ID);

    // Connection tracked
    expect(connections.get('socket-1')).toEqual({
      lobbyId: FAKE_LOBBY_ID,
      clientId: FAKE_HOST_ID,
    });

    // Ack called with success payload
    expect(ack).toHaveBeenCalledWith({
      ok: true,
      lobbyId: FAKE_LOBBY_ID,
      hostId: FAKE_HOST_ID,
      clientId: FAKE_HOST_ID,
      participants: [
        {
          clientId: FAKE_HOST_ID,
          name: 'Alice',
          isAdmin: true,
        },
      ],
      isRevealed: false,
    });

    // socket.emit also fires lobby:created
    expect(socket.emit).toHaveBeenCalledWith('lobby:created', {
      ok: true,
      lobbyId: FAKE_LOBBY_ID,
      hostId: FAKE_HOST_ID,
      clientId: FAKE_HOST_ID,
      participants: [
        {
          clientId: FAKE_HOST_ID,
          name: 'Alice',
          isAdmin: true,
        },
      ],
      isRevealed: false,
    });
  });

  it('defaults host name to "Anonymous" when no name is provided', async () => {
    const ack = vi.fn();

    await handleCreateLobby(socket, undefined, ack);

    const lobby = lobbies.get(FAKE_LOBBY_ID);
    const host = lobby.participants.get(FAKE_HOST_ID);
    expect(host!.name).toBe('Anonymous');

    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        participants: [
          expect.objectContaining({ name: 'Anonymous' }),
        ],
      })
    );
  });

  it('returns a CAPTCHA error and does not create a lobby when captcha fails', async () => {
    verifyCaptcha.mockResolvedValue(false);
    const ack = vi.fn();

    await handleCreateLobby(socket, { name: 'Eve', captchaToken: 'bad' }, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Invalid CAPTCHA' });

    // No lobby was created
    expect(lobbies.size).toBe(0);
    expect(connections.size).toBe(0);
    expect(saveLobby).not.toHaveBeenCalled();
    expect(appEvents.emit).not.toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('still creates the lobby and emits on the socket when no ack callback is provided', async () => {
    await handleCreateLobby(socket, { name: 'Bob' });

    // Lobby was created
    expect(lobbies.size).toBe(1);
    expect(saveLobby).toHaveBeenCalled();
    expect(appEvents.emit).toHaveBeenCalled();
    expect(socket.join).toHaveBeenCalledWith(FAKE_LOBBY_ID);

    // socket.emit still fires
    expect(socket.emit).toHaveBeenCalledWith(
      'lobby:created',
      expect.objectContaining({
        ok: true,
        lobbyId: FAKE_LOBBY_ID,
      })
    );
  });

  it('does not throw when captcha fails and no ack is provided', async () => {
    verifyCaptcha.mockResolvedValue(false);
    await expect(handleCreateLobby(socket, { captchaToken: 'bad' })).resolves.toBeUndefined();
    expect(lobbies.size).toBe(0);
  });

  it('clears a pending removal timer for the lobby id', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const fakeTimer = setTimeout(() => undefined, 99999) as ReturnType<typeof setTimeout>;
    lobbyRemovalTimers.set(FAKE_LOBBY_ID, fakeTimer);

    const ack = vi.fn();

    await handleCreateLobby(socket, { name: 'Carol', captchaToken: 'tok' }, ack);

    expect(clearTimeoutSpy).toHaveBeenCalledWith(fakeTimer);
    expect(lobbyRemovalTimers.has(FAKE_LOBBY_ID)).toBe(false);

    // Lobby was still created successfully
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, lobbyId: FAKE_LOBBY_ID })
    );

    clearTimeoutSpy.mockRestore();
    clearTimeout(fakeTimer);
  });
});
