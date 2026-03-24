## 1. Test Infrastructure Setup

- [x] 1.1 Create `apps/lobby-server/vitest.config.ts` with Node environment, coverage config excluding `main.ts`, and proper module resolution for ESM
- [x] 1.2 Add `test` target to `apps/lobby-server/project.json` so `nx test lobby-server` works

## 2. Utility & Captcha Tests

- [x] 2.1 Create `apps/lobby-server/src/utils.spec.ts` — test `normalizeName` (valid name, empty, undefined, whitespace-only), `serializeParticipants` (multiple, empty), `toStoredLobby`, and `fromStoredLobby`
- [x] 2.2 Create `apps/lobby-server/src/captcha.spec.ts` — test `verifyCaptcha` with mocked fetch: no secret (bypass), no token, valid token, invalid token, network error, IP forwarding

## 3. LobbyService Tests

- [x] 3.1 Create `apps/lobby-server/src/LobbyService.spec.ts` — mock Redis client; test `lobbyKey`, `generateLobbyId` (no collision, collision retry), `saveLobby` (redis.set + expire), `loadLobby` (cache hit, Redis hit, not found, invalid JSON)

## 4. Action Handler Tests

- [x] 4.1 Create `apps/lobby-server/src/actions/create-lobby.spec.ts` — mock LobbyService, captcha, and events; test successful creation (with/without name), CAPTCHA failure, no ack callback, removal timer cancellation
- [x] 4.2 Create `apps/lobby-server/src/actions/join-lobby.spec.ts` — test new participant join, rejoin (skips CAPTCHA), lobby not found, CAPTCHA failure for new participant
- [x] 4.3 Create `apps/lobby-server/src/actions/vote.spec.ts` — test successful vote, null card, missing lobbyId, lobby not found, socket not connected, participant not found
- [x] 4.4 Create `apps/lobby-server/src/actions/reveal.spec.ts` — test host reveals, non-host rejected, already revealed, missing lobbyId, lobby not found
- [x] 4.5 Create `apps/lobby-server/src/actions/reset.spec.ts` — test host resets (clears votes + isRevealed), non-host rejected, missing lobbyId, lobby not found
- [x] 4.6 Create `apps/lobby-server/src/actions/sync.spec.ts` — test successful sync, clientId re-establishment, missing lobbyId, lobby not found
- [x] 4.7 Create `apps/lobby-server/src/actions/exists.spec.ts` — test lobby exists, does not exist, missing lobbyId, no ack
- [x] 4.8 Create `apps/lobby-server/src/actions/disconnect.spec.ts` — test disconnect with others remaining, last disconnect (schedules removal), timer replacement, reconnect before timer fires, no connection mapping

## 5. Event System Tests

- [x] 5.1 Create `apps/lobby-server/src/events/events.spec.ts` — test appEvents emit/listen for LOBBY_CREATED and LOBBY_JOINED
- [x] 5.2 Create `apps/lobby-server/src/events/stats-handlers.spec.ts` — mock Redis; test registerStatsHandlers increments counters on events, catches Redis errors

## 6. Coverage Verification

- [x] 6.1 Run `nx test lobby-server --coverage` and verify 100% line/branch coverage for all files except `main.ts`
