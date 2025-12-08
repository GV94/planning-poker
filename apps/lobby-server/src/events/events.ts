import { EventEmitter } from 'events';
import type { LobbyId } from 'shared-types';

class AppEventEmitter extends EventEmitter {}
export const appEvents = new AppEventEmitter();

export const LOBBY_CREATED = 'lobby:created';
export const LOBBY_JOINED = 'lobby:joined';

export interface LobbyCreatedEvent {
  lobbyId: LobbyId;
  timestamp: number;
}

export interface LobbyJoinedEvent {
  lobbyId: LobbyId;
  timestamp: number;
}

