import { describe, it, expect } from 'vitest';
import './setup.js';
import {
  createClient,
  createLobbyHelper,
  joinLobbyHelper,
  emitWithAck,
  waitForConnect,
} from './helpers.js';

describe('edge cases', () => {
  describe('missing data', () => {
    it('lobby:vote without lobbyId returns error', async () => {
      const socket = createClient();
      await waitForConnect(socket);

      const res = await emitWithAck(socket, 'lobby:vote', { card: 5 });
      expect(res.ok).toBe(false);
      expect(res.error).toContain('lobbyId');
    });

    it('lobby:reveal without lobbyId returns error', async () => {
      const socket = createClient();
      await waitForConnect(socket);

      const res = await emitWithAck(socket, 'lobby:reveal', {});
      expect(res.ok).toBe(false);
      expect(res.error).toContain('lobbyId');
    });

    it('lobby:reset without lobbyId returns error', async () => {
      const socket = createClient();
      await waitForConnect(socket);

      const res = await emitWithAck(socket, 'lobby:reset', {});
      expect(res.ok).toBe(false);
      expect(res.error).toContain('lobbyId');
    });

    it('lobby:sync without lobbyId returns error', async () => {
      const socket = createClient();
      await waitForConnect(socket);

      const res = await emitWithAck(socket, 'lobby:sync', {});
      expect(res.ok).toBe(false);
      expect(res.error).toContain('lobbyId');
    });

    it('lobby:exists without lobbyId returns false', async () => {
      const socket = createClient();
      await waitForConnect(socket);

      const res = await emitWithAck(socket, 'lobby:exists', {});
      expect(res.ok).toBe(false);
    });
  });

  describe('permission checks', () => {
    it('voting without being a participant fails', async () => {
      const host = await createLobbyHelper('Host');

      // Create a socket that connects but doesn't join the lobby
      const outsider = createClient();
      await waitForConnect(outsider);

      const res = await emitWithAck(outsider, 'lobby:vote', {
        lobbyId: host.lobbyId,
        card: 5,
      });

      expect(res.ok).toBe(false);
      expect(res.error).toContain('participant');
    });
  });

  describe('disconnect handling', () => {
    it('client can disconnect without error', async () => {
      const host = await createLobbyHelper('Host');
      const participant = await joinLobbyHelper(host.lobbyId, 'Leaver');

      // Disconnect the participant
      participant.socket.disconnect();

      // Host should still be able to interact with the lobby
      const res = await emitWithAck(host.socket, 'lobby:exists', {
        lobbyId: host.lobbyId,
      });
      expect(res.ok).toBe(true);
    });
  });
});
