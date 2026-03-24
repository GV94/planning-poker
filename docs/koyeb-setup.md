# Koyeb Dashboard Configuration

## Service Setup

- **Image source**: GHCR — `ghcr.io/gv94/planning-poker/lobby-server:latest`
- **Port**: `3002`
- **Health check path**: `/health`
- **Health check protocol**: HTTP

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Server port (must match the port above, `3002`) |
| `CORS_ORIGIN` | Yes | Frontend URL (e.g., `https://plokr.app`) |
| `REDIS_URL` | Yes | Redis connection string (e.g., `redis://user:pass@host:port`) |
| `TURNSTILE_SECRET_KEY` | No | Cloudflare Turnstile secret for CAPTCHA verification |

## GitHub Actions Secrets

The deploy workflow requires:

| Secret/Variable | Type | Description |
|---|---|---|
| `KOYEB_TOKEN` | Secret | Koyeb API token for CLI authentication |
| `KOYEB_SERVICE_NAME` | Variable | Koyeb service identifier (e.g., `my-app/lobby-server`) |

## Scale-to-Zero Behavior

Koyeb's free tier scales to zero after inactivity. The frontend handles this with:

1. Health check on page load (`GET /health`) triggers cold start
2. A wake-up overlay keeps users engaged during the 10-30s cold start
3. Socket.IO reconnection automatically syncs lobby state after restart
