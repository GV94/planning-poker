import { appEvents, LOBBY_CREATED, LOBBY_JOINED } from './events.js';

const { mockRedis } = vi.hoisted(() => ({
  mockRedis: { incr: vi.fn() },
}));

vi.mock('../LobbyService.js', () => ({
  redis: mockRedis,
}));

import { registerStatsHandlers } from './stats-handlers.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  appEvents.removeAllListeners();
  vi.restoreAllMocks();
});

describe('registerStatsHandlers', () => {
  beforeEach(() => {
    mockRedis.incr.mockReset();
    mockRedis.incr.mockResolvedValue(1);
    registerStatsHandlers();
  });

  it('increments stats:total_lobbies on LOBBY_CREATED', async () => {
    appEvents.emit(LOBBY_CREATED);
    await flush();

    expect(mockRedis.incr).toHaveBeenCalledOnce();
    expect(mockRedis.incr).toHaveBeenCalledWith('stats:total_lobbies');
  });

  it('increments stats:total_joins on LOBBY_JOINED', async () => {
    appEvents.emit(LOBBY_JOINED);
    await flush();

    expect(mockRedis.incr).toHaveBeenCalledOnce();
    expect(mockRedis.incr).toHaveBeenCalledWith('stats:total_joins');
  });

  it('catches redis errors on LOBBY_CREATED without crashing', async () => {
    const error = new Error('Redis connection lost');
    mockRedis.incr.mockRejectedValueOnce(error);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    appEvents.emit(LOBBY_CREATED);
    await flush();

    expect(consoleSpy).toHaveBeenCalledWith('Error updating lobby stats:', error);
  });

  it('catches redis errors on LOBBY_JOINED without crashing', async () => {
    const error = new Error('Redis connection lost');
    mockRedis.incr.mockRejectedValueOnce(error);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    appEvents.emit(LOBBY_JOINED);
    await flush();

    expect(consoleSpy).toHaveBeenCalledWith('Error updating join stats:', error);
  });
});
