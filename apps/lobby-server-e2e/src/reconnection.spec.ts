import { describe, it, expect } from 'vitest';
import './setup.js';
import {
  createLobbyHelper,
  joinLobbyHelper,
  emitWithAck,
  createClient,
  waitForConnect,
} from './helpers.js';

describe('lobby:sync', () => {
  it('syncs with valid lobby and clientId', async () => {
    const host = await createLobbyHelper('Host');
    const participant = await joinLobbyHelper(host.lobbyId, 'Player');

    // Sync from a new socket (simulating reconnection)
    const newSocket = createClient();
    await waitForConnect(newSocket);

    const res = await emitWithAck(newSocket, 'lobby:sync', {
      lobbyId: host.lobbyId,
      clientId: participant.clientId,
    });

    expect(res.ok).toBe(true);
    expect(res.lobbyId).toBe(host.lobbyId);
    expect(res.hostId).toBe(host.hostId);
    expect(res.isRevealed).toBe(false);
    expect((res.participants as unknown[]).length).toBe(2);
  });

  it('syncs without clientId (read-only state)', async () => {
    const host = await createLobbyHelper('Host');

    const newSocket = createClient();
    await waitForConnect(newSocket);

    const res = await emitWithAck(newSocket, 'lobby:sync', {
      lobbyId: host.lobbyId,
    });

    expect(res.ok).toBe(true);
    expect(res.lobbyId).toBe(host.lobbyId);
  });

  it('rejects sync for non-existent lobby', async () => {
    const socket = createClient();
    await waitForConnect(socket);

    const res = await emitWithAck(socket, 'lobby:sync', {
      lobbyId: 'nonexistent123',
    });

    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });
});
