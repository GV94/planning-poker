import { describe, it, expect } from 'vitest';
import './setup.js';
import {
  createLobbyHelper,
  joinLobbyHelper,
  emitWithAck,
  waitForEvent,
  createClient,
  waitForConnect,
} from './helpers.js';

describe('lobby:vote', () => {
  it('casts a numeric vote and broadcasts to others', async () => {
    const host = await createLobbyHelper('Host');
    const participant = await joinLobbyHelper(host.lobbyId, 'Voter');

    // Listen for the voted event on the host
    const votedPromise = waitForEvent(host.socket, 'lobby:voted');

    const res = await emitWithAck(participant.socket, 'lobby:vote', {
      lobbyId: host.lobbyId,
      card: 5,
    });

    expect(res.ok).toBe(true);

    const voted = (await votedPromise) as { clientId: string; card: number };
    expect(voted.clientId).toBe(participant.clientId);
    expect(voted.card).toBe(5);
  });

  it('casts special card votes (? and coffee)', async () => {
    const host = await createLobbyHelper('Host');
    const participant = await joinLobbyHelper(host.lobbyId, 'Voter');

    const res1 = await emitWithAck(participant.socket, 'lobby:vote', {
      lobbyId: host.lobbyId,
      card: '?',
    });
    expect(res1.ok).toBe(true);

    const res2 = await emitWithAck(participant.socket, 'lobby:vote', {
      lobbyId: host.lobbyId,
      card: '☕',
    });
    expect(res2.ok).toBe(true);
  });

  it('clears a vote with null', async () => {
    const host = await createLobbyHelper('Host');
    const participant = await joinLobbyHelper(host.lobbyId, 'Voter');

    // Listen for both vote events before sending
    const votes: Array<{ card: number | string | null }> = [];
    host.socket.on('lobby:voted', (data: { card: number | string | null }) => {
      votes.push(data);
    });

    // Vote then clear
    await emitWithAck(participant.socket, 'lobby:vote', {
      lobbyId: host.lobbyId,
      card: 8,
    });

    const res = await emitWithAck(participant.socket, 'lobby:vote', {
      lobbyId: host.lobbyId,
      card: null,
    });

    expect(res.ok).toBe(true);

    // Wait briefly for broadcast events to arrive
    await new Promise((r) => setTimeout(r, 100));
    expect(votes).toHaveLength(2);
    expect(votes[1].card).toBeNull();
  });

  it('rejects vote in non-existent lobby', async () => {
    const socket = createClient();
    await waitForConnect(socket);

    const res = await emitWithAck(socket, 'lobby:vote', {
      lobbyId: 'nonexistent',
      card: 5,
    });

    expect(res.ok).toBe(false);
  });
});

describe('lobby:reveal', () => {
  it('host reveals votes', async () => {
    const host = await createLobbyHelper('Host');
    const participant = await joinLobbyHelper(host.lobbyId, 'Voter');

    // Cast votes first
    await emitWithAck(host.socket, 'lobby:vote', {
      lobbyId: host.lobbyId,
      card: 3,
    });
    await emitWithAck(participant.socket, 'lobby:vote', {
      lobbyId: host.lobbyId,
      card: 5,
    });

    // Listen for revealed event on participant
    const revealedPromise = waitForEvent(participant.socket, 'lobby:revealed');

    const res = await emitWithAck(host.socket, 'lobby:reveal', {
      lobbyId: host.lobbyId,
    });

    expect(res.ok).toBe(true);
    const revealed = (await revealedPromise) as { lobbyId: string };
    expect(revealed.lobbyId).toBe(host.lobbyId);
  });

  it('non-host cannot reveal', async () => {
    const host = await createLobbyHelper('Host');
    const participant = await joinLobbyHelper(host.lobbyId, 'Voter');

    const res = await emitWithAck(participant.socket, 'lobby:reveal', {
      lobbyId: host.lobbyId,
    });

    expect(res.ok).toBe(false);
    expect(res.error).toContain('owner');
  });

  it('rejects reveal for non-existent lobby', async () => {
    const socket = createClient();
    await waitForConnect(socket);

    const res = await emitWithAck(socket, 'lobby:reveal', {
      lobbyId: 'nonexistent',
    });

    expect(res.ok).toBe(false);
  });
});

describe('lobby:reset', () => {
  it('host resets lobby and clears votes', async () => {
    const host = await createLobbyHelper('Host');
    const participant = await joinLobbyHelper(host.lobbyId, 'Voter');

    // Vote and reveal
    await emitWithAck(host.socket, 'lobby:vote', {
      lobbyId: host.lobbyId,
      card: 3,
    });
    await emitWithAck(participant.socket, 'lobby:vote', {
      lobbyId: host.lobbyId,
      card: 5,
    });
    await emitWithAck(host.socket, 'lobby:reveal', {
      lobbyId: host.lobbyId,
    });

    // Listen for reset event on participant
    const resetPromise = waitForEvent(participant.socket, 'lobby:reset');

    const res = await emitWithAck(host.socket, 'lobby:reset', {
      lobbyId: host.lobbyId,
    });

    expect(res.ok).toBe(true);
    await resetPromise;

    // Verify state is cleared via sync
    const syncRes = await emitWithAck(host.socket, 'lobby:sync', {
      lobbyId: host.lobbyId,
      clientId: host.clientId,
    });

    expect(syncRes.ok).toBe(true);
    expect(syncRes.isRevealed).toBe(false);
    const participants = syncRes.participants as Array<{ vote?: number }>;
    for (const p of participants) {
      expect(p.vote).toBeUndefined();
    }
  });

  it('non-host cannot reset', async () => {
    const host = await createLobbyHelper('Host');
    const participant = await joinLobbyHelper(host.lobbyId, 'Voter');

    const res = await emitWithAck(participant.socket, 'lobby:reset', {
      lobbyId: host.lobbyId,
    });

    expect(res.ok).toBe(false);
    expect(res.error).toContain('owner');
  });
});
