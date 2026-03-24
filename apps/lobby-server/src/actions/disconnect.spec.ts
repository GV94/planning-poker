import type { LobbyId } from 'shared-types';
import { handleDisconnect } from './disconnect.js';

vi.mock('../LobbyService.js', () => ({
  connections: new Map(),
  lobbies: new Map(),
  lobbyRemovalTimers: new Map(),
  lobbyKey: vi.fn((id: string) => `lobby:${id}`),
  redis: { del: vi.fn() },
}));

import {
  connections,
  lobbies,
  lobbyKey,
  lobbyRemovalTimers,
  redis,
} from '../LobbyService.js';

describe('handleDisconnect', () => {
  const lobbyId = 'lobby-1' as LobbyId;
  const socket = { id: 'socket-1' } as any;

  beforeEach(() => {
    vi.useFakeTimers();
    connections.clear();
    lobbies.clear();
    lobbyRemovalTimers.clear();
    (redis.del as ReturnType<typeof vi.fn>).mockClear();
    (lobbyKey as ReturnType<typeof vi.fn>).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('removes connection but does not set timer when other connections remain', () => {
    connections.set('socket-1', { lobbyId, clientId: 'client-1' });
    connections.set('socket-2', { lobbyId, clientId: 'client-2' });

    handleDisconnect(socket);

    expect(connections.has('socket-1')).toBe(false);
    expect(connections.has('socket-2')).toBe(true);
    expect(lobbyRemovalTimers.has(lobbyId)).toBe(false);
  });

  it('schedules a 5-minute removal timer when last connection disconnects', () => {
    connections.set('socket-1', { lobbyId, clientId: 'client-1' });

    handleDisconnect(socket);

    expect(connections.has('socket-1')).toBe(false);
    expect(lobbyRemovalTimers.has(lobbyId)).toBe(true);
  });

  it('deletes lobby from memory and redis when timer fires with no reconnect', () => {
    connections.set('socket-1', { lobbyId, clientId: 'client-1' });
    lobbies.set(lobbyId, { id: lobbyId } as any);

    handleDisconnect(socket);

    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(lobbies.has(lobbyId)).toBe(false);
    expect(redis.del).toHaveBeenCalledWith('lobby:lobby-1');
    expect(lobbyRemovalTimers.has(lobbyId)).toBe(false);
  });

  it('does NOT delete lobby when someone reconnected before timer fires', () => {
    connections.set('socket-1', { lobbyId, clientId: 'client-1' });
    lobbies.set(lobbyId, { id: lobbyId } as any);

    handleDisconnect(socket);

    // Simulate a reconnection before the timer fires
    connections.set('socket-3', { lobbyId, clientId: 'client-1' });

    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(lobbies.has(lobbyId)).toBe(true);
    expect(redis.del).not.toHaveBeenCalled();
    expect(lobbyRemovalTimers.has(lobbyId)).toBe(false);
  });

  it('clears existing timer and sets a new one on subsequent disconnect', () => {
    connections.set('socket-1', { lobbyId, clientId: 'client-1' });

    handleDisconnect(socket);

    const firstTimer = lobbyRemovalTimers.get(lobbyId);
    expect(firstTimer).toBeDefined();

    // Another socket for the same lobby connects and disconnects
    const socket2 = { id: 'socket-2' } as any;
    connections.set('socket-2', { lobbyId, clientId: 'client-2' });

    handleDisconnect(socket2);

    const secondTimer = lobbyRemovalTimers.get(lobbyId);
    expect(secondTimer).toBeDefined();
    expect(secondTimer).not.toBe(firstTimer);
  });

  it('does nothing when socket has no connection mapping', () => {
    handleDisconnect(socket);

    expect(connections.size).toBe(0);
    expect(lobbyRemovalTimers.size).toBe(0);
  });
});
