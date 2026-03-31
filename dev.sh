#!/usr/bin/env bash
set -euo pipefail

# Allocate free ports for each service so multiple environments can coexist.
find_free_port() {
  python3 -c "import socket; s=socket.socket(); s.bind(('',0)); print(s.getsockname()[1]); s.close()"
}

export WEB_PORT="${WEB_PORT:-$(find_free_port)}"
export P2P_PORT="${P2P_PORT:-$(find_free_port)}"
export REDIS_PORT="${REDIS_PORT:-$(find_free_port)}"

echo "Starting dev environment:"
echo "  Web:    http://localhost:$WEB_PORT"
echo "  P2P:    http://localhost:$P2P_PORT"
echo "  Redis:  localhost:$REDIS_PORT"

docker compose up "$@"
