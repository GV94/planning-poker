import type { LobbyId, ClientId, PlanningPokerCard } from 'shared-types';

export interface ParticipantInfo {
  clientId: ClientId;
  name: string;
  vote?: PlanningPokerCard;
  isAdmin: boolean;
}

export interface Lobby {
  id: LobbyId;
  hostId: ClientId;
  participants: Map<ClientId, ParticipantInfo>;
  isRevealed: boolean;
}

export interface CreateLobbyAckPayload {
  lobbyId: LobbyId;
  hostId: ClientId;
  clientId: ClientId;
  participants: ParticipantInfo[];
  isRevealed: boolean;
}

export interface JoinLobbySuccessPayload {
  ok: true;
  lobbyId: LobbyId;
  hostId: ClientId;
  clientId: ClientId;
  participants: ParticipantInfo[];
  isRevealed: boolean;
}

export interface JoinLobbyErrorPayload {
  ok: false;
  error: string;
}

export type JoinLobbyAckPayload = JoinLobbySuccessPayload | JoinLobbyErrorPayload;

export interface VoteSuccessPayload {
  ok: true;
}

export interface VoteErrorPayload {
  ok: false;
  error: string;
}

export type VoteAckPayload = VoteSuccessPayload | VoteErrorPayload;

export interface RevealSuccessPayload {
  ok: true;
}

export interface RevealErrorPayload {
  ok: false;
  error: string;
}

export type RevealAckPayload = RevealSuccessPayload | RevealErrorPayload;

export interface ResetSuccessPayload {
  ok: true;
}

export interface ResetErrorPayload {
  ok: false;
  error: string;
}

export type ResetAckPayload = ResetSuccessPayload | ResetErrorPayload;

export interface StoredLobby {
  id: LobbyId;
  hostId: ClientId;
  participants: ParticipantInfo[];
  isRevealed: boolean;
}

