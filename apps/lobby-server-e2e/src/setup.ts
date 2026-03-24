import type { Server as HttpServer } from 'http';
import type { Server as SocketIOServer } from 'socket.io';
import { beforeAll, afterAll } from 'vitest';

// Set required env vars before server modules load
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

let httpServer: HttpServer | undefined;
let io: SocketIOServer | undefined;
let port: number | undefined;
let dbIndex: number | undefined;

export function getPort(): number {
  if (port === undefined) throw new Error('Server not started — call setupServer() in beforeAll');
  return port;
}

beforeAll(async () => {
  // Dynamically import so env vars are set first
  const { redis } = await import('../../lobby-server/src/LobbyService.js');

  // Select a random Redis database for isolation across parallel runs
  dbIndex = Math.floor(Math.random() * 16);
  await redis.select(dbIndex);
  await redis.flushDb();

  const { createApp } = await import('../../lobby-server/src/app.js');
  const app = createApp();
  httpServer = app.httpServer;
  io = app.io;

  await new Promise<void>((resolve) => {
    httpServer!.listen(0, () => resolve());
  });

  const addr = httpServer!.address();
  if (!addr || typeof addr === 'string') throw new Error('Unexpected server address');
  port = addr.port;
});

afterAll(async () => {
  // Close all Socket.IO connections
  if (io) {
    io.close();
  }

  // Close HTTP server
  if (httpServer) {
    await new Promise<void>((resolve) => httpServer!.close(() => resolve()));
  }

  // Clean up in-memory state
  const { lobbies, connections, lobbyRemovalTimers, redis } = await import(
    '../../lobby-server/src/LobbyService.js'
  );
  lobbies.clear();
  connections.clear();
  for (const timer of lobbyRemovalTimers.values()) clearTimeout(timer);
  lobbyRemovalTimers.clear();

  // Flush the test database and disconnect
  try {
    await redis.flushDb();
    await redis.quit();
  } catch {
    // Redis may already be disconnected
  }
});
