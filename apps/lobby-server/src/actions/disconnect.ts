import type { Socket } from 'socket.io';
import {
  connections,
  lobbies,
  lobbyKey,
  lobbyRemovalTimers,
  redis,
} from '../LobbyService.js';

export function handleDisconnect(socket: Socket) {
  const conn = connections.get(socket.id);
  if (conn) {
    connections.delete(socket.id);
    const stillHasConnections = Array.from(connections.values()).some(
      (c) => c.lobbyId === conn.lobbyId
    );
    if (!stillHasConnections) {
      // Schedule lobby removal after a grace period, so a single user
      // refreshing the page doesn't immediately delete the lobby.
      const existingTimer = lobbyRemovalTimers.get(conn.lobbyId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      const timeout = setTimeout(() => {
        const hasReturnedConnections = Array.from(connections.values()).some(
          (c) => c.lobbyId === conn.lobbyId
        );
        if (!hasReturnedConnections) {
          lobbies.delete(conn.lobbyId);
          void redis.del(lobbyKey(conn.lobbyId));
        }
        lobbyRemovalTimers.delete(conn.lobbyId);
      }, 5 * 60 * 1000); // 5 minutes
      lobbyRemovalTimers.set(conn.lobbyId, timeout);
    }
  }
}

