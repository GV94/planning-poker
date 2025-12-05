import type { LobbyId } from 'shared-types';
import { loadLobby } from '../LobbyService.js';

export async function handleExists(
  data: { lobbyId?: LobbyId },
  ack?: (payload: { ok: boolean }) => void
) {
  if (!ack) return;
  const lobbyId = data?.lobbyId;
  if (!lobbyId) {
    ack({ ok: false });
    return;
  }
  const lobby = await loadLobby(lobbyId);
  ack({ ok: Boolean(lobby) });
}

