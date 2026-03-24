## Context

Plokr is a planning poker app with a Socket.IO backend (`apps/lobby-server`) and React frontend (`apps/web`). The backend uses Redis for persistent lobby storage with an in-memory cache. The frontend connects via WebSocket-only transport and has basic reconnection via Socket.IO defaults and a `visibilitychange`-based sync.

The app is moving from always-on hosting to Koyeb free tier, which enforces scale-to-zero. The server will sleep after inactivity and cold start in 10-30 seconds on the next request. The frontend currently has no awareness of server availability — it assumes the backend is always reachable.

## Goals / Non-Goals

**Goals:**
- Users on the landing page immediately understand when the server is sleeping and can't interact until it wakes
- The wake-up experience is calming and charming, not frustrating
- Users in a lobby survive a server restart/cold start without losing their session
- A single reusable overlay component serves both the landing page (blocking) and lobby page (reconnecting) cases
- Deploy pipeline targets Koyeb with GitHub Actions

**Non-Goals:**
- Keeping the server awake (no ping hacks — we embrace scale-to-zero)
- Backend code changes for cold start handling (existing `/health` and `lobby:sync` are sufficient)
- Offline mode or client-side lobby state persistence beyond what localStorage already provides
- Server-sent push notifications when the server wakes up

## Decisions

### 1. Health-check-as-wake-trigger

The frontend pings `GET /health` on page load. On Koyeb, this HTTP request itself triggers the cold start — the platform holds the request until the service is ready. This means we don't need a separate wake mechanism; the health check both detects state and triggers the wake.

**Why not Socket.IO connection attempt?** Socket.IO's connection has its own retry logic and timeouts that are harder to control for UX purposes. A simple `fetch('/health')` with a 2-second threshold gives us clean state transitions: response in <2s = already awake, >2s = waking up.

### 2. React context for server status

A `ServerStatusProvider` wraps the app at the root layout level. It exposes:
- `status`: `'checking' | 'waking' | 'online' | 'disconnected'`
- `isReady`: boolean shorthand for `status === 'online'`

State transitions:
```
Mount → CHECKING
         ├── /health responds < 2s → ONLINE
         └── /health pending > 2s  → WAKING → /health responds → ONLINE

ONLINE → socket disconnects → DISCONNECTED → socket reconnects → ONLINE
```

The context monitors both the initial health check AND the Socket.IO connection state (once a socket exists). Socket reference is set by the lobby connection module after connecting.

**Why a context, not a hook?** Multiple components need this state (landing page buttons, lobby page overlay, root layout indicator). A context avoids prop drilling and duplicate health checks.

### 3. Single overlay component, two modes

`WakeUpOverlay` accepts a `mode` prop:
- `mode="blocking"` — full-screen, covers everything (landing page)
- `mode="overlay"` — positioned over parent with backdrop blur (lobby page)

Both modes share the same animation, messages, and explainer. The only difference is positioning and backdrop treatment.

### 4. Animations via Tailwind CSS only

All animations (breathing circle, message crossfade, progress shimmer, dot pulse) are implemented with Tailwind's `animate-` utilities and custom keyframes in `tailwind.config.mts`. No animation library needed — keeps the bundle lean.

The breathing animation is a slow `scale` + `opacity` cycle (~4s period). Messages crossfade every 3.5 seconds using opacity transitions on swap.

### 5. Reconnection hardening

Currently, `lobby:sync` is only called on `visibilitychange`. We extend this to also fire on Socket.IO's `reconnect` event. The flow:

```
Socket disconnects
  → status becomes DISCONNECTED
  → overlay appears on lobby page
  → Socket.IO auto-reconnects (default exponential backoff)
  → on reconnect: emit lobby:sync with stored lobbyId + clientId
    → success: restore state, hide overlay, show "happy planning" message
    → failure (lobby gone): show "lobby has ended" with link back to landing page
```

The stored `clientId` from localStorage allows the server to re-associate the reconnecting user with their participant record in Redis.

### 6. Koyeb deployment

Docker-based deployment using the existing `apps/lobby-server/Dockerfile`. GitHub Actions workflow:
- Build image → push to GHCR
- Trigger Koyeb redeploy via Koyeb CLI or API

Koyeb natively pulls from GHCR, so the workflow is simpler than the SSH-based Lightsail approach. Environment variables (REDIS_URL, CORS_ORIGIN, etc.) are configured in the Koyeb dashboard.

## Risks / Trade-offs

**[Cold start time is unpredictable]** → The overlay uses indeterminate animations (no progress bar with percentage). The rotating messages keep users engaged during waits of any length. If Koyeb cold starts become very slow (>30s), the experience still works — it just shows more messages.

**[Health check could fail for reasons other than cold start]** → The overlay treats all failures the same (server unreachable = show waking UI). This is correct behavior — whether the server is sleeping, deploying, or crashed, the user experience should be the same: wait and retry.

**[Socket.IO reconnect after cold start may race with server readiness]** → Socket.IO's exponential backoff naturally handles this. The server's `/health` endpoint returning 200 means it's ready to accept WebSocket connections.

**[In-memory cache is empty after cold start]** → The server's `LobbyService` already falls through to Redis when the in-memory cache misses. The first `lobby:sync` call after a cold start will be slightly slower (Redis round-trip) but functionally correct.
