import type { LobbyId } from 'shared-types';
import {
  appEvents,
  LOBBY_CREATED,
  LOBBY_JOINED,
  type LobbyCreatedEvent,
  type LobbyJoinedEvent,
} from './events.js';

afterEach(() => {
  appEvents.removeAllListeners();
});

describe('event constants', () => {
  it('LOBBY_CREATED equals "lobby:created"', () => {
    expect(LOBBY_CREATED).toBe('lobby:created');
  });

  it('LOBBY_JOINED equals "lobby:joined"', () => {
    expect(LOBBY_JOINED).toBe('lobby:joined');
  });
});

describe('appEvents', () => {
  it('emits and receives LOBBY_CREATED events', () => {
    const listener = vi.fn();
    appEvents.on(LOBBY_CREATED, listener);

    const payload: LobbyCreatedEvent = {
      lobbyId: 'test-lobby-1' as LobbyId,
      timestamp: Date.now(),
    };

    appEvents.emit(LOBBY_CREATED, payload);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(payload);
  });

  it('emits and receives LOBBY_JOINED events', () => {
    const listener = vi.fn();
    appEvents.on(LOBBY_JOINED, listener);

    const payload: LobbyJoinedEvent = {
      lobbyId: 'test-lobby-2' as LobbyId,
      timestamp: Date.now(),
    };

    appEvents.emit(LOBBY_JOINED, payload);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(payload);
  });
});
