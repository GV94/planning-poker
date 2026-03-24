import { describe, it, expect } from 'vitest';
import './setup.js';
import {
  createClient,
  createLobbyHelper,
  joinLobbyHelper,
  emitWithAck,
  waitForConnect,
  waitForEvent,
} from './helpers.js';

describe('lobby:create', () => {
  it('creates a lobby with a name', async () => {
    const { socket, lobbyId, hostId, clientId } = await createLobbyHelper('Alice');

    expect(lobbyId).toBeTruthy();
    expect(hostId).toBeTruthy();
    expect(clientId).toBe(hostId);
    socket.disconnect();
  });

  it('creates a lobby without a name (defaults to Anonymous)', async () => {
    const socket = createClient();
    await waitForConnect(socket);

    const res = await emitWithAck(socket, 'lobby:create', {});

    expect(res.ok).toBe(true);
    expect(res.lobbyId).toBeTruthy();
    expect((res.participants as Array<{ name: string }>)[0].name).toBe('Anonymous');
  });
});

describe('lobby:join', () => {
  it('joins an existing lobby', async () => {
    const host = await createLobbyHelper('Host');

    // Listen for participant-joined event on host
    const joinedPromise = waitForEvent(host.socket, 'lobby:participant-joined');

    const participant = await joinLobbyHelper(host.lobbyId, 'Bob');
    const joinedEvent = await joinedPromise;

    expect(participant.clientId).toBeTruthy();
    expect(participant.clientId).not.toBe(host.clientId);
    expect((joinedEvent as { name: string }).name).toBe('Bob');
  });

  it('rejects joining a non-existent lobby', async () => {
    const socket = createClient();
    await waitForConnect(socket);

    const res = await emitWithAck(socket, 'lobby:join', {
      lobbyId: 'nonexistent123',
      name: 'Bob',
    });

    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it('rejects joining without lobbyId', async () => {
    const socket = createClient();
    await waitForConnect(socket);

    const res = await emitWithAck(socket, 'lobby:join', {});

    expect(res.ok).toBe(false);
    expect(res.error).toBe('Missing lobbyId');
  });

  it('allows rejoining with existing clientId', async () => {
    const host = await createLobbyHelper('Host');
    const participant = await joinLobbyHelper(host.lobbyId, 'Bob');
    const originalClientId = participant.clientId;

    // Disconnect and rejoin with same clientId
    participant.socket.disconnect();

    const socket2 = createClient();
    await waitForConnect(socket2);

    const res = await emitWithAck(socket2, 'lobby:join', {
      lobbyId: host.lobbyId,
      name: 'Bob',
      clientId: originalClientId,
    });

    expect(res.ok).toBe(true);
    // Should not have duplicate participants
    const participants = res.participants as Array<{ clientId: string }>;
    const clientIds = participants.map((p) => p.clientId);
    expect(new Set(clientIds).size).toBe(clientIds.length);
  });
});

describe('lobby:exists', () => {
  it('returns true for existing lobby', async () => {
    const host = await createLobbyHelper('Host');

    const socket = createClient();
    await waitForConnect(socket);

    const res = await emitWithAck(socket, 'lobby:exists', {
      lobbyId: host.lobbyId,
    });

    expect(res.ok).toBe(true);
  });

  it('returns false for non-existent lobby', async () => {
    const socket = createClient();
    await waitForConnect(socket);

    const res = await emitWithAck(socket, 'lobby:exists', {
      lobbyId: 'doesnotexist999',
    });

    expect(res.ok).toBe(false);
  });
});
