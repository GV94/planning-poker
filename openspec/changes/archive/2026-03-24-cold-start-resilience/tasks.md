## 1. Server Status Detection

- [x] 1.1 Create `ServerStatusProvider` context and `useServerStatus` hook in `apps/web/src/contexts/server-status.tsx` — implements health check on mount, 2-second threshold for waking detection, status state machine (checking → waking → online, online → disconnected → online)
- [x] 1.2 Add socket registration to the status provider — expose a `registerSocket` function that the lobby connection module calls after connecting, so the provider can monitor disconnect/reconnect events
- [x] 1.3 Wrap the app with `ServerStatusProvider` in `apps/web/src/app/root.tsx`

## 2. Wake-Up Overlay

- [x] 2.1 Add custom Tailwind keyframes and animation utilities in `tailwind.config.mts` — breathing scale+opacity cycle (~4s), crossfade transition, progress shimmer, and smooth fade-out
- [x] 2.2 Create `WakeUpOverlay` component in `apps/web/src/components/ui/wake-up-overlay.tsx` — breathing animation, rotating message list with crossfade (3.5s interval), expandable "Why am I seeing this?" section with sponsorship prompt, success state ("Everything is set up for you, happy planning!") with checkmark, and smooth fade-out. Accepts `mode` prop: `"blocking"` (full-screen) or `"overlay"` (positioned with backdrop blur)

## 3. Server Status Indicator

- [x] 3.1 Create `ServerStatusIndicator` component in `apps/web/src/components/ui/server-status-indicator.tsx` — small pulsing dot (green when online, amber when waking/disconnected) with status text, positioned in the top of the screen
- [x] 3.2 Add `ServerStatusIndicator` to the root layout in `apps/web/src/app/root.tsx`

## 4. Landing Page Integration

- [x] 4.1 Add `WakeUpOverlay` in blocking mode to the landing page (`apps/web/src/app/screens/landing-page.tsx`) — shown when server status is `checking` or `waking`, fades out on `online`
- [x] 4.2 Disable "Create lobby" and "Join lobby" buttons when `isReady` is false from the server status context

## 5. Lobby Page Integration

- [x] 5.1 Add `WakeUpOverlay` in overlay mode to the lobby page (`apps/web/src/app/screens/lobby-page.tsx`) — shown when server status is `disconnected`, with lobby content blurred/dimmed underneath
- [x] 5.2 Disable vote cards, reveal, and reset buttons when server status is `disconnected`
- [x] 5.3 Handle lobby-gone-after-reconnect — when `lobby:sync` fails on reconnect, show "lobby has ended" message with a link back to the landing page and clear the stored session

## 6. Reconnection Hardening

- [x] 6.1 Add `reconnect` event handler in lobby connection module (`apps/web/src/p2p/lobby-connection.ts`) — on Socket.IO reconnect, automatically emit `lobby:sync` with stored lobbyId and clientId
- [x] 6.2 Call `registerSocket` from the server status provider after establishing a socket connection, so the provider tracks disconnect/reconnect state
- [x] 6.3 Verify the server's in-memory cache miss falls through to Redis correctly on cold start (manual test — no code change expected)

## 7. Koyeb Deployment

- [x] 7.1 Update `.github/workflows/deploy.yml` — replace Lightsail SSH deploy with Koyeb CLI redeploy (`koyeb service redeploy`) triggered after GHCR image push
- [x] 7.2 Update `docker-compose.prod.yml` — remove Redis sidecar (Redis is now external via Redis Cloud), keep only the lobby-server service
- [x] 7.3 Remove `deploy/setup.sh` and `deploy/nginx.conf` (Koyeb handles TLS termination and reverse proxy)
- [x] 7.4 Document required Koyeb dashboard configuration: environment variables, health check path, port, GHCR image source
