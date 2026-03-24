import type { Server, Socket } from 'socket.io';
import type { ClientId, LobbyId } from 'shared-types';
import type { Lobby, ParticipantInfo } from '../types.js';
import { handleJoinLobby } from './join-lobby.js';

const {
  FAKE_CLIENT_ID,
  connections,
  loadLobby,
  saveLobby,
  verifyCaptcha,
  appEvents,
  LOBBY_JOINED,
} = vi.hoisted(() => {
  const FAKE_CLIENT_ID = 'new-client-uuid' as ClientId;
  const connections = new Map<
    string,
    { lobbyId: LobbyId; clientId: ClientId }
  >();
  const loadLobby = vi.fn<() => Promise<Lobby | null>>();
  const saveLobby = vi.fn<() => Promise<void>>(() => Promise.resolve());
  const verifyCaptcha = vi.fn<() => Promise<boolean>>();
  const appEvents = { emit: vi.fn() };
  const LOBBY_JOINED = 'lobby:joined';

  return {
    FAKE_CLIENT_ID,
    connections,
    loadLobby,
    saveLobby,
    verifyCaptcha,
    appEvents,
    LOBBY_JOINED,
  };
});

vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => FAKE_CLIENT_ID),
}));

vi.mock('../LobbyService.js', () => ({
  connections,
  loadLobby,
  saveLobby,
}));

vi.mock('../captcha.js', () => ({
  verifyCaptcha,
}));

vi.mock('../events/events.js', () => ({
  appEvents,
  LOBBY_JOINED,
}));

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
  participants: ParticipantInfo[] = [],
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

function createMockIo() {
  const emitFn = vi.fn();
  return {
    to: vi.fn().mockReturnValue({ emit: emitFn }),
    __emit: emitFn,
  } as unknown as Server & { __emit: ReturnType<typeof vi.fn> };
}

function createMockSocket(): Socket {
  return {
    id: 'socket-1',
    join: vi.fn(),
    handshake: { address: '127.0.0.1' },
  } as unknown as Socket;
}

describe('handleJoinLobby', () => {
  let io: ReturnType<typeof createMockIo>;
  let socket: Socket;

  beforeEach(() => {
    io = createMockIo();
    socket = createMockSocket();
    connections.clear();
    vi.clearAllMocks();
    verifyCaptcha.mockResolvedValue(true);
    saveLobby.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('new participant joins', () => {
    it('adds a new participant, joins the room, acks with success, emits participant-joined, and saves', async () => {
      const existingHost = makeParticipant('host-1', 'Host', {
        isAdmin: true,
      });
      const lobby = makeLobby([existingHost]);
      loadLobby.mockResolvedValue(lobby);

      const ack = vi.fn();

      await handleJoinLobby(
        io as unknown as Server,
        socket,
        'lobby-1' as LobbyId,
        'Alice',
        undefined,
        ack,
        'captcha-token'
      );

      // Captcha was verified with the token and socket address
      expect(verifyCaptcha).toHaveBeenCalledWith('captcha-token', '127.0.0.1');

      // New participant added to the lobby
      expect(lobby.participants.size).toBe(2);
      const newParticipant = lobby.participants.get(FAKE_CLIENT_ID);
      expect(newParticipant).toEqual({
        clientId: FAKE_CLIENT_ID,
        name: 'Alice',
        isAdmin: false,
      });

      // Socket joined the lobby room
      expect(socket.join).toHaveBeenCalledWith('lobby-1');

      // Connection tracked
      expect(connections.get('socket-1')).toEqual({
        lobbyId: 'lobby-1' as LobbyId,
        clientId: FAKE_CLIENT_ID,
      });

      // Ack called with success payload
      expect(ack).toHaveBeenCalledWith({
        ok: true,
        lobbyId: 'lobby-1' as LobbyId,
        hostId: 'host-1' as ClientId,
        clientId: FAKE_CLIENT_ID,
        participants: expect.arrayContaining([
          existingHost,
          {
            clientId: FAKE_CLIENT_ID,
            name: 'Alice',
            isAdmin: false,
          },
        ]),
        isRevealed: false,
      });

      // appEvents.emit was called with LOBBY_JOINED
      expect(appEvents.emit).toHaveBeenCalledWith(
        LOBBY_JOINED,
        expect.objectContaining({
          lobbyId: 'lobby-1' as LobbyId,
          timestamp: expect.any(Number),
        })
      );

      // io.to().emit fires participant-joined event
      expect(io.to).toHaveBeenCalledWith('lobby-1');
      expect(io.__emit).toHaveBeenCalledWith('lobby:participant-joined', {
        lobbyId: 'lobby-1' as LobbyId,
        clientId: FAKE_CLIENT_ID,
        name: 'Alice',
      });

      // saveLobby was called
      expect(saveLobby).toHaveBeenCalledWith(lobby);
    });

    it('defaults the display name to "Anonymous" when name is undefined', async () => {
      const lobby = makeLobby([makeParticipant('host-1', 'Host')]);
      loadLobby.mockResolvedValue(lobby);
      const ack = vi.fn();

      await handleJoinLobby(
        io as unknown as Server,
        socket,
        'lobby-1' as LobbyId,
        undefined,
        undefined,
        ack,
        'tok'
      );

      const newParticipant = lobby.participants.get(FAKE_CLIENT_ID);
      expect(newParticipant!.name).toBe('Anonymous');

      expect(io.__emit).toHaveBeenCalledWith(
        'lobby:participant-joined',
        expect.objectContaining({ name: 'Anonymous' })
      );
    });
  });

  describe('existing participant rejoins', () => {
    it('updates the name, does not emit participant-joined, and saves', async () => {
      const existingParticipant = makeParticipant('client-1', 'OldName');
      const lobby = makeLobby([existingParticipant]);
      loadLobby.mockResolvedValue(lobby);

      const ack = vi.fn();

      await handleJoinLobby(
        io as unknown as Server,
        socket,
        'lobby-1' as LobbyId,
        'NewName',
        'client-1' as ClientId,
        ack,
        'tok'
      );

      // Captcha is skipped for rejoining participants
      expect(verifyCaptcha).not.toHaveBeenCalled();

      // Name was updated
      const participant = lobby.participants.get('client-1' as ClientId);
      expect(participant!.name).toBe('NewName');

      // No new participant was added
      expect(lobby.participants.size).toBe(1);

      // Socket joined the room
      expect(socket.join).toHaveBeenCalledWith('lobby-1');

      // Connection tracked
      expect(connections.get('socket-1')).toEqual({
        lobbyId: 'lobby-1' as LobbyId,
        clientId: 'client-1' as ClientId,
      });

      // Ack called with success
      expect(ack).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          clientId: 'client-1' as ClientId,
        })
      );

      // No participant-joined event emitted
      expect(io.__emit).not.toHaveBeenCalled();

      // No appEvents emitted
      expect(appEvents.emit).not.toHaveBeenCalled();

      // saveLobby was called
      expect(saveLobby).toHaveBeenCalledWith(lobby);
    });

    it('preserves existing participant properties like isAdmin when rejoining', async () => {
      const adminParticipant = makeParticipant('client-1', 'Admin', {
        isAdmin: true,
      });
      const lobby = makeLobby([adminParticipant]);
      loadLobby.mockResolvedValue(lobby);

      await handleJoinLobby(
        io as unknown as Server,
        socket,
        'lobby-1' as LobbyId,
        'AdminRenamed',
        'client-1' as ClientId,
        vi.fn(),
        'tok'
      );

      const participant = lobby.participants.get('client-1' as ClientId);
      expect(participant!.name).toBe('AdminRenamed');
      expect(participant!.isAdmin).toBe(true);
    });
  });

  describe('lobby not found', () => {
    it('acks with an error when the lobby does not exist', async () => {
      loadLobby.mockResolvedValue(null);
      const ack = vi.fn();

      await handleJoinLobby(
        io as unknown as Server,
        socket,
        'nonexistent' as LobbyId,
        'Alice',
        undefined,
        ack,
        'tok'
      );

      expect(ack).toHaveBeenCalledWith({
        ok: false,
        error: 'Lobby not found',
      });

      // Nothing else happened
      expect(socket.join).not.toHaveBeenCalled();
      expect(saveLobby).not.toHaveBeenCalled();
      expect(appEvents.emit).not.toHaveBeenCalled();
      expect(connections.size).toBe(0);
    });

    it('does not throw when lobby is not found and ack is undefined', async () => {
      loadLobby.mockResolvedValue(null);

      await expect(
        handleJoinLobby(
          io as unknown as Server,
          socket,
          'nonexistent' as LobbyId,
          'Alice',
          undefined,
          undefined,
          'tok'
        )
      ).resolves.toBeUndefined();

      expect(socket.join).not.toHaveBeenCalled();
      expect(saveLobby).not.toHaveBeenCalled();
    });
  });

  describe('CAPTCHA failure', () => {
    it('acks with an error when captcha verification fails for a new participant', async () => {
      const lobby = makeLobby([makeParticipant('host-1', 'Host')]);
      loadLobby.mockResolvedValue(lobby);
      verifyCaptcha.mockResolvedValue(false);
      const ack = vi.fn();

      await handleJoinLobby(
        io as unknown as Server,
        socket,
        'lobby-1' as LobbyId,
        'Eve',
        undefined,
        ack,
        'bad-token'
      );

      expect(verifyCaptcha).toHaveBeenCalledWith('bad-token', '127.0.0.1');
      expect(ack).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid CAPTCHA',
      });

      // loadLobby is called (lobby is loaded before captcha check)
      expect(loadLobby).toHaveBeenCalledWith('lobby-1');
      expect(socket.join).not.toHaveBeenCalled();
      expect(saveLobby).not.toHaveBeenCalled();
      expect(appEvents.emit).not.toHaveBeenCalled();
      expect(connections.size).toBe(0);
    });

    it('does not throw when captcha fails and ack is undefined', async () => {
      const lobby = makeLobby([makeParticipant('host-1', 'Host')]);
      loadLobby.mockResolvedValue(lobby);
      verifyCaptcha.mockResolvedValue(false);

      await expect(
        handleJoinLobby(
          io as unknown as Server,
          socket,
          'lobby-1' as LobbyId,
          'Eve',
          undefined,
          undefined,
          'bad-token'
        )
      ).resolves.toBeUndefined();

      expect(loadLobby).toHaveBeenCalledWith('lobby-1');
      expect(socket.join).not.toHaveBeenCalled();
      expect(saveLobby).not.toHaveBeenCalled();
    });
  });

  describe('no ack callback', () => {
    it('completes successfully without an ack callback for a new participant', async () => {
      const lobby = makeLobby([makeParticipant('host-1', 'Host')]);
      loadLobby.mockResolvedValue(lobby);

      await handleJoinLobby(
        io as unknown as Server,
        socket,
        'lobby-1' as LobbyId,
        'Bob',
        undefined,
        undefined,
        'tok'
      );

      // Participant was added
      expect(lobby.participants.size).toBe(2);

      // Socket joined the room
      expect(socket.join).toHaveBeenCalledWith('lobby-1');

      // Events emitted
      expect(appEvents.emit).toHaveBeenCalledWith(
        LOBBY_JOINED,
        expect.objectContaining({ lobbyId: 'lobby-1' as LobbyId })
      );
      expect(io.__emit).toHaveBeenCalledWith(
        'lobby:participant-joined',
        expect.objectContaining({
          lobbyId: 'lobby-1' as LobbyId,
          clientId: FAKE_CLIENT_ID,
          name: 'Bob',
        })
      );

      // Lobby was saved
      expect(saveLobby).toHaveBeenCalledWith(lobby);
    });

    it('completes successfully without an ack callback for a rejoining participant', async () => {
      const existingParticipant = makeParticipant('client-1', 'OldName');
      const lobby = makeLobby([existingParticipant]);
      loadLobby.mockResolvedValue(lobby);

      await handleJoinLobby(
        io as unknown as Server,
        socket,
        'lobby-1' as LobbyId,
        'NewName',
        'client-1' as ClientId,
        undefined,
        'tok'
      );

      // Name updated, no new participant
      expect(lobby.participants.size).toBe(1);
      expect(lobby.participants.get('client-1' as ClientId)!.name).toBe(
        'NewName'
      );

      // No participant-joined event
      expect(io.__emit).not.toHaveBeenCalled();
      expect(appEvents.emit).not.toHaveBeenCalled();

      // Lobby was saved
      expect(saveLobby).toHaveBeenCalledWith(lobby);
    });
  });

  describe('inconsistent participants map fallback', () => {
    it('treats as new participant when has() returns true but get() returns undefined', async () => {
      const participant = makeParticipant('client-1', 'OldName');
      const lobby = makeLobby([participant]);
      // Make .get() return undefined while .has() still returns true
      const originalGet = lobby.participants.get.bind(lobby.participants);
      lobby.participants.get = ((key: ClientId) => {
        if (key === ('client-1' as ClientId)) return undefined;
        return originalGet(key);
      }) as typeof lobby.participants.get;

      loadLobby.mockResolvedValue(lobby);
      const ack = vi.fn();

      await handleJoinLobby(
        io as unknown as Server,
        socket,
        'lobby-1' as LobbyId,
        'FallbackName',
        'client-1' as ClientId,
        ack,
        'tok'
      );

      // Should have created a new participant with a generated UUID
      expect(lobby.participants.has(FAKE_CLIENT_ID)).toBe(true);
      const newParticipant = lobby.participants.get(FAKE_CLIENT_ID);
      expect(newParticipant).toEqual({
        clientId: FAKE_CLIENT_ID,
        name: 'FallbackName',
        isAdmin: false,
      });

      // participant-joined event should have been emitted
      expect(appEvents.emit).toHaveBeenCalledWith(
        LOBBY_JOINED,
        expect.objectContaining({ lobbyId: 'lobby-1' as LobbyId })
      );
    });
  });

  describe('existingClientId not in lobby', () => {
    it('treats as a new participant when existingClientId is not found in lobby participants', async () => {
      const lobby = makeLobby([makeParticipant('host-1', 'Host')]);
      loadLobby.mockResolvedValue(lobby);
      const ack = vi.fn();

      await handleJoinLobby(
        io as unknown as Server,
        socket,
        'lobby-1' as LobbyId,
        'Charlie',
        'unknown-client' as ClientId,
        ack,
        'tok'
      );

      // Captcha was verified (not a rejoin)
      expect(verifyCaptcha).toHaveBeenCalledWith('tok', '127.0.0.1');

      // New participant was added with a generated UUID
      expect(lobby.participants.size).toBe(2);
      expect(lobby.participants.has(FAKE_CLIENT_ID)).toBe(true);

      // participant-joined event was emitted
      expect(io.__emit).toHaveBeenCalledWith(
        'lobby:participant-joined',
        expect.objectContaining({ clientId: FAKE_CLIENT_ID })
      );

      expect(appEvents.emit).toHaveBeenCalledWith(
        LOBBY_JOINED,
        expect.objectContaining({ lobbyId: 'lobby-1' as LobbyId })
      );

      expect(saveLobby).toHaveBeenCalledWith(lobby);
    });
  });
});
