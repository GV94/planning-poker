import { describe, it, expect } from 'vitest';
import './setup.js';
import {
  createLobbyHelper,
  joinLobbyHelper,
  emitWithAck,
  waitForEvent,
} from './helpers.js';

describe('full voting round', () => {
  it('create → join → vote → reveal → reset', async () => {
    // Step 1: Host creates a lobby
    const host = await createLobbyHelper('Host');
    expect(host.lobbyId).toBeTruthy();

    // Step 2: Two participants join
    const joinedPromise1 = waitForEvent(host.socket, 'lobby:participant-joined');
    const p1 = await joinLobbyHelper(host.lobbyId, 'Alice');
    await joinedPromise1;

    const joinedPromise2 = waitForEvent(host.socket, 'lobby:participant-joined');
    const p2 = await joinLobbyHelper(host.lobbyId, 'Bob');
    await joinedPromise2;

    // Step 3: All three vote
    const [hostVote, p1Vote, p2Vote] = await Promise.all([
      emitWithAck(host.socket, 'lobby:vote', {
        lobbyId: host.lobbyId,
        card: 3,
      }),
      emitWithAck(p1.socket, 'lobby:vote', {
        lobbyId: host.lobbyId,
        card: 5,
      }),
      emitWithAck(p2.socket, 'lobby:vote', {
        lobbyId: host.lobbyId,
        card: 8,
      }),
    ]);

    expect(hostVote.ok).toBe(true);
    expect(p1Vote.ok).toBe(true);
    expect(p2Vote.ok).toBe(true);

    // Step 4: Host reveals
    const p1RevealPromise = waitForEvent(p1.socket, 'lobby:revealed');
    const p2RevealPromise = waitForEvent(p2.socket, 'lobby:revealed');

    const revealRes = await emitWithAck(host.socket, 'lobby:reveal', {
      lobbyId: host.lobbyId,
    });

    expect(revealRes.ok).toBe(true);
    await p1RevealPromise;
    await p2RevealPromise;

    // Step 5: Verify revealed state via sync
    const syncRes = await emitWithAck(host.socket, 'lobby:sync', {
      lobbyId: host.lobbyId,
      clientId: host.clientId,
    });

    expect(syncRes.ok).toBe(true);
    expect(syncRes.isRevealed).toBe(true);
    const participants = syncRes.participants as Array<{
      clientId: string;
      vote?: number | string;
    }>;
    expect(participants).toHaveLength(3);

    // All three should have votes
    const votes = participants.map((p) => p.vote);
    expect(votes).toContain(3);
    expect(votes).toContain(5);
    expect(votes).toContain(8);

    // Step 6: Host resets
    const p1ResetPromise = waitForEvent(p1.socket, 'lobby:reset');
    const p2ResetPromise = waitForEvent(p2.socket, 'lobby:reset');

    const resetRes = await emitWithAck(host.socket, 'lobby:reset', {
      lobbyId: host.lobbyId,
    });

    expect(resetRes.ok).toBe(true);
    await p1ResetPromise;
    await p2ResetPromise;

    // Step 7: Verify reset state
    const syncRes2 = await emitWithAck(host.socket, 'lobby:sync', {
      lobbyId: host.lobbyId,
      clientId: host.clientId,
    });

    expect(syncRes2.ok).toBe(true);
    expect(syncRes2.isRevealed).toBe(false);
    const resetParticipants = syncRes2.participants as Array<{
      vote?: number | string;
    }>;
    for (const p of resetParticipants) {
      expect(p.vote).toBeUndefined();
    }
  });
});
