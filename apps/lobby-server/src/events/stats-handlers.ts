import { redis } from '../LobbyService.js';
import { appEvents, LOBBY_CREATED, LOBBY_JOINED } from './events.js';

const TOTAL_LOBBIES_KEY = 'stats:total_lobbies';
const TOTAL_JOINS_KEY = 'stats:total_joins';

export function registerStatsHandlers() {
  appEvents.on(LOBBY_CREATED, async () => {
    try {
      // Redis INCR is atomic, so we can safely increment without a mutex.
      await redis.incr(TOTAL_LOBBIES_KEY);
    } catch (err) {
      console.error('Error updating lobby stats:', err);
    }
  });

  appEvents.on(LOBBY_JOINED, async () => {
    try {
      await redis.incr(TOTAL_JOINS_KEY);
    } catch (err) {
      console.error('Error updating join stats:', err);
    }
  });
}
