import type { randomBytes as RandomBytesFn } from 'crypto';
import type { ClientId, LobbyId } from 'shared-types';
import type { Lobby, ParticipantInfo, StoredLobby } from './types.js';

// --- Mock redis BEFORE importing LobbyService (top-level side effects) ---

const fakeRedisClient = {
  set: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  expire: vi.fn().mockResolvedValue(true),
  del: vi.fn().mockResolvedValue(1),
  incr: vi.fn().mockResolvedValue(1),
  on: vi.fn().mockReturnThis(),
  connect: vi.fn().mockResolvedValue(undefined),
};

vi.mock('redis', () => ({
  createClient: vi.fn(() => fakeRedisClient),
}));

// Mock crypto so we can control randomBytes in the collision test.
// We capture the real implementation from inside the factory (importOriginal)
// to avoid circular references caused by vi.mock hoisting.
let realRandomBytes: typeof RandomBytesFn;
const mockRandomBytes = vi.fn((...args: Parameters<typeof RandomBytesFn>) =>
  realRandomBytes(...args)
);
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  realRandomBytes = actual.randomBytes;
  mockRandomBytes.mockImplementation(actual.randomBytes);
  return {
    ...actual,
    randomBytes: mockRandomBytes,
  };
});

// Ensure the env var exists before the module reads it at import time.
vi.stubEnv('REDIS_URL', 'redis://localhost:6379');

// Now it is safe to import — the redis mock is in place and REDIS_URL is set.
const {
  lobbyKey,
  generateLobbyId,
  saveLobby,
  loadLobby,
  lobbies,
  redis,
} = await import('./LobbyService.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  id: string,
  participants: ParticipantInfo[] = [],
  overrides: Partial<Omit<Lobby, 'participants'>> = {}
): Lobby {
  return {
    id: id as LobbyId,
    hostId: 'host-1' as ClientId,
    isRevealed: false,
    ...overrides,
    participants: new Map(participants.map((p) => [p.clientId, p])),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  lobbies.clear();
  vi.restoreAllMocks();
  mockRandomBytes.mockReset().mockImplementation((...args: Parameters<typeof realRandomBytes>) => realRandomBytes(...args));
  fakeRedisClient.set.mockReset().mockResolvedValue('OK');
  fakeRedisClient.get.mockReset().mockResolvedValue(null);
  fakeRedisClient.expire.mockReset().mockResolvedValue(true);
});

// ---- Module-level side effects -------------------------------------------

describe('module-level redis setup', () => {
  it('registers an error handler on the redis client', () => {
    expect(fakeRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('the error handler logs to console.error', () => {
    const errorHandler = fakeRedisClient.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'error'
    )?.[1] as (err: unknown) => void;
    expect(errorHandler).toBeDefined();

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    errorHandler(new Error('test error'));
    expect(consoleSpy).toHaveBeenCalledWith('Redis client error', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('calls redis.connect()', () => {
    expect(fakeRedisClient.connect).toHaveBeenCalled();
  });

  it('logs error when redis.connect() rejects', async () => {
    vi.resetModules();
    const connectError = new Error('Connection refused');
    fakeRedisClient.connect.mockRejectedValueOnce(connectError);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await import('./LobbyService.js');
    // Let microtask (catch handler) run
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to connect to Redis at',
      'redis://localhost:6379',
      connectError
    );
    consoleSpy.mockRestore();
    fakeRedisClient.connect.mockResolvedValue(undefined);
  });

  it('throws when REDIS_URL is not set', async () => {
    vi.resetModules();
    vi.stubEnv('REDIS_URL', '');
    delete process.env.REDIS_URL;

    await expect(import('./LobbyService.js')).rejects.toThrow(
      'REDIS_URL environment variable is required'
    );

    vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
  });

  it('passes REDIS_URL directly to createClient', async () => {
    vi.resetModules();
    vi.stubEnv('REDIS_URL', 'redis://myuser:mypass@redis-host:6379');

    const { createClient } = await import('redis');
    await import('./LobbyService.js');

    expect(createClient).toHaveBeenCalledWith({
      url: 'redis://myuser:mypass@redis-host:6379',
    });

    vi.unstubAllEnvs();
    vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
  });
});

// ---- lobbyKey ------------------------------------------------------------

describe('lobbyKey', () => {
  it('returns "lobby:" prefixed with the given id', () => {
    const result = lobbyKey('abc123' as LobbyId);
    expect(result).toBe('lobby:abc123');
  });

  it('handles empty string id', () => {
    const result = lobbyKey('' as LobbyId);
    expect(result).toBe('lobby:');
  });
});

// ---- generateLobbyId -----------------------------------------------------

describe('generateLobbyId', () => {
  it('returns a 12-character hex string', () => {
    const id = generateLobbyId();
    expect(id).toMatch(/^[0-9a-f]{12}$/);
  });

  it('retries when the generated id already exists in the lobbies map', () => {
    // Pre-populate lobbies with a known id so the first attempt collides.
    const collidingId = 'aabbccddeeff';
    const collidingBuffer = Buffer.from(collidingId, 'hex');
    lobbies.set(collidingId as LobbyId, makeLobby(collidingId));

    const uniqueId = '112233445566';
    const uniqueBuffer = Buffer.from(uniqueId, 'hex');

    // First call returns the colliding buffer, second returns a unique one.
    mockRandomBytes
      .mockReturnValueOnce(collidingBuffer)
      .mockReturnValueOnce(uniqueBuffer);

    const id = generateLobbyId();

    expect(mockRandomBytes).toHaveBeenCalledTimes(2);
    expect(id).toBe(uniqueId);
    expect(id).not.toBe(collidingId);
  });
});

// ---- saveLobby -----------------------------------------------------------

describe('saveLobby', () => {
  it('calls redis.set with the lobby key and serialised JSON', async () => {
    const p1 = makeParticipant('c1', 'Alice', { isAdmin: true });
    const lobby = makeLobby('lobby-1', [p1], {
      hostId: 'c1' as ClientId,
      isRevealed: false,
    });

    await saveLobby(lobby);

    expect(redis.set).toHaveBeenCalledOnce();

    const [key, jsonStr] = (redis.set as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    expect(key).toBe('lobby:lobby-1');

    const parsed = JSON.parse(jsonStr) as StoredLobby;
    expect(parsed.id).toBe('lobby-1');
    expect(parsed.hostId).toBe('c1');
    expect(parsed.isRevealed).toBe(false);
    expect(parsed.participants).toEqual([p1]);
  });

  it('calls redis.expire with a 24-hour TTL (86400 seconds)', async () => {
    const lobby = makeLobby('lobby-ttl');

    await saveLobby(lobby);

    expect(redis.expire).toHaveBeenCalledOnce();
    expect(redis.expire).toHaveBeenCalledWith('lobby:lobby-ttl', 86400);
  });

  it('calls expire after set (order matters)', async () => {
    const callOrder: string[] = [];
    (redis.set as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callOrder.push('set');
      return 'OK';
    });
    (redis.expire as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callOrder.push('expire');
      return true;
    });

    const lobby = makeLobby('lobby-order');

    await saveLobby(lobby);

    expect(callOrder).toEqual(['set', 'expire']);
  });
});

// ---- loadLobby -----------------------------------------------------------

describe('loadLobby', () => {
  it('returns the cached lobby from the in-memory map without calling redis', async () => {
    const p1 = makeParticipant('c1', 'Alice');
    const lobby = makeLobby('cached-id', [p1]);
    lobbies.set('cached-id' as LobbyId, lobby);

    const result = await loadLobby('cached-id' as LobbyId);

    expect(result).toBe(lobby); // same reference
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('fetches from Redis when lobby is not in the in-memory map', async () => {
    const p1 = makeParticipant('c1', 'Alice', { isAdmin: true });
    const stored: StoredLobby = {
      id: 'redis-id' as LobbyId,
      hostId: 'c1' as ClientId,
      isRevealed: true,
      participants: [p1],
    };

    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify(stored)
    );

    const result = await loadLobby('redis-id' as LobbyId);

    expect(redis.get).toHaveBeenCalledWith('lobby:redis-id');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('redis-id');
    expect(result!.hostId).toBe('c1');
    expect(result!.isRevealed).toBe(true);
    expect(result!.participants).toBeInstanceOf(Map);
    expect(result!.participants.size).toBe(1);
    expect(result!.participants.get('c1' as ClientId)).toEqual(p1);
  });

  it('caches the lobby in the in-memory map after fetching from Redis', async () => {
    const stored: StoredLobby = {
      id: 'cache-me' as LobbyId,
      hostId: 'h1' as ClientId,
      isRevealed: false,
      participants: [],
    };

    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify(stored)
    );

    const result = await loadLobby('cache-me' as LobbyId);

    expect(lobbies.has('cache-me' as LobbyId)).toBe(true);
    expect(lobbies.get('cache-me' as LobbyId)).toBe(result);
  });

  it('returns null when the lobby is not in Redis', async () => {
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const result = await loadLobby('missing' as LobbyId);

    expect(result).toBeNull();
  });

  it('returns null when Redis contains invalid JSON', async () => {
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      '%%%not-json%%%'
    );

    const result = await loadLobby('bad-json' as LobbyId);

    expect(result).toBeNull();
  });
});
