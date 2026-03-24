## Why

Plokr is moving to Koyeb's free tier, which enforces scale-to-zero after a period of inactivity. This means the server sleeps when no users are connected and takes 10-30 seconds to cold start when the next user arrives. Without frontend awareness of this, users will see broken connection states, unresponsive buttons, and have no idea why. The server also needs to gracefully restore lobby state from Redis after a cold start so that reconnecting clients can resume their sessions.

## What Changes

- Add a `ServerStatusProvider` React context that tracks backend availability via health checks and socket connection state
- Add a `WakeUpOverlay` component — a calming, animated full-screen overlay shown when the server is sleeping/waking, with rotating fun messages and an expandable "why am I seeing this?" explainer with sponsorship prompt
- Add a `ServerStatusIndicator` component — a subtle pulsing dot in the top bar showing server status at all times
- Disable lobby creation and join buttons on the landing page while the server is offline
- Show the wake-up overlay on the lobby page when the socket disconnects mid-session
- Harden the Socket.IO reconnection flow to call `lobby:sync` on every reconnect and handle "lobby expired" gracefully
- Update deployment config: replace Lightsail pipeline with Koyeb free tier (Docker-based, GitHub Actions deploy)

## Capabilities

### New Capabilities
- `server-status-detection`: React context that pings `/health` on mount, classifies server state (CHECKING/WAKING/ONLINE/DISCONNECTED), and exposes status to the component tree
- `wake-up-overlay`: Reusable animated overlay with breathing animation, rotating loading messages, expandable explainer, and success transition — used on both landing page and lobby page
- `server-status-indicator`: Persistent top-bar status dot (green pulse when online, amber animation when sleeping/waking)
- `reconnection-resilience`: Hardened Socket.IO reconnection that triggers `lobby:sync` on every reconnect, handles lobby-not-found after cold start, and surfaces disconnect/reconnect state to the UI
- `koyeb-deployment`: Koyeb deployment config and GitHub Actions workflow replacing the Lightsail pipeline

### Modified Capabilities

## Impact

- **Frontend**: `apps/web/` — new context provider in root layout, overlay component, status indicator, changes to landing page and lobby page
- **Backend**: `apps/lobby-server/` — no logic changes needed; existing `/health` endpoint and `lobby:sync` event are sufficient. In-memory cache rebuilds from Redis on demand.
- **Deployment**: `.github/workflows/deploy.yml`, `docker-compose.prod.yml`, `deploy/` directory — replaced with Koyeb-specific config
- **Dependencies**: No new npm packages required (animations via Tailwind CSS)
