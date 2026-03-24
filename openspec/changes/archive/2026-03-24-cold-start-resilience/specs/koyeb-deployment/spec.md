## ADDED Requirements

### Requirement: Koyeb service configuration
The deployment SHALL target Koyeb's free tier using the existing Docker image built from `apps/lobby-server/Dockerfile`.

#### Scenario: Service configuration
- **WHEN** the service is deployed to Koyeb
- **THEN** it SHALL use the Docker image from GHCR (`ghcr.io/gv94/planning-poker/lobby-server`)
- **AND** it SHALL expose port 3002
- **AND** it SHALL configure the `/health` endpoint for health checks

### Requirement: GitHub Actions deploy workflow
The deploy workflow SHALL build the Docker image, push it to GHCR, and trigger a Koyeb redeploy.

#### Scenario: Automatic deploy on push to main
- **WHEN** changes to lobby-server code are pushed to the `main` branch
- **THEN** the workflow SHALL build the Docker image
- **AND** push it to GHCR with `latest` and commit SHA tags
- **AND** trigger a redeploy on Koyeb via the Koyeb CLI or API

#### Scenario: Manual deploy trigger
- **WHEN** the workflow is triggered manually via `workflow_dispatch`
- **THEN** it SHALL perform the same build, push, and deploy steps

### Requirement: Environment configuration
All runtime environment variables SHALL be configured in the Koyeb dashboard, not baked into the image.

#### Scenario: Required environment variables
- **WHEN** the service runs on Koyeb
- **THEN** the following environment variables SHALL be configurable: `PORT`, `CORS_ORIGIN`, `TURNSTILE_SECRET_KEY`, `REDIS_URL`, `REDIS_USERNAME`, `REDIS_PASSWORD`, `REDIS_PORT`
