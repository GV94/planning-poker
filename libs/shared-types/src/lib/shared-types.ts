export type LobbyId = string;

export type ClientId = string;

export type PlanningPokerCard =
  | 0
  | 0.5
  | 1
  | 2
  | 3
  | 5
  | 8
  | 13
  | 21
  | 34
  | 55
  | 100
  | '?';

export interface PlayerState {
  id: ClientId;
  name: string;
  isAdmin: boolean;
  connected: boolean;
  vote?: PlanningPokerCard;
}

export interface LobbyState {
  id: LobbyId;
  players: PlayerState[];
  isRevealed: boolean;
  round: number;
}

export type GameMessage =
  | {
      type: 'vote';
      from: ClientId;
      card: PlanningPokerCard | null;
    }
  | {
      type: 'reveal';
      from: ClientId;
    }
  | {
      type: 'reset';
      from: ClientId;
    }
  | {
      type: 'state-sync';
      state: LobbyState;
    };

export type SignallingMessage =
  | {
      type: 'join';
      lobbyId: LobbyId;
      clientId: ClientId;
      name: string;
    }
  | {
      type: 'leave';
      lobbyId: LobbyId;
      clientId: ClientId;
    }
  | {
      type: 'signal';
      lobbyId: LobbyId;
      from: ClientId;
      to: ClientId;
      payload: unknown;
    }
  | {
      type: 'game';
      lobbyId: LobbyId;
      from: ClientId;
      payload: GameMessage;
    };
