#!/usr/bin/env bash
# Start the full parallel-dev stack for the current branch:
#   - Compose: Postgres + Keycloak on hash-derived host ports
#   - portless: routes http://*.${BRANCH_SLUG}.localhost:1355 to local Gradle/Vite
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=dev-env.sh
source "$SCRIPT_DIR/dev-env.sh"

PORTLESS="$SCRIPT_DIR/node_modules/.bin/portless"
if [[ ! -x "$PORTLESS" ]]; then
  echo "portless not installed. Run: npm --prefix scripts install" >&2
  exit 1
fi

# Ensure the frontend's dependencies exist — `npm run dev` (vite) fails with
# "vite: command not found" otherwise. Only install when missing.
FRONTEND_DIR="$REPO_ROOT/services/shop/shop-frontend"
if [[ ! -x "$FRONTEND_DIR/node_modules/.bin/vite" ]]; then
  echo "Installing frontend dependencies (one-time)..."
  npm --prefix "$FRONTEND_DIR" install
fi

cat <<EOF
Starting parallel dev for branch '${BRANCH_SLUG}':
  postgres   localhost:${POSTGRES_PORT}
  keycloak   http://auth.${BRANCH_SLUG}.localhost:1355     (compose-host port ${KEYCLOAK_PORT})
  frontend   http://app.${BRANCH_SLUG}.localhost:1355
  shop       http://shop.${BRANCH_SLUG}.localhost:1355
  delivery   http://delivery.${BRANCH_SLUG}.localhost:1355
  warehouse  http://warehouse.${BRANCH_SLUG}.localhost:1355
EOF

docker compose -f "$REPO_ROOT/stack/docker-compose.yml" up -d --wait

# Start the proxy daemon up-front (lazy start triggers a sudo prompt on TTY-less
# invocations). --no-tls + the unprivileged port from $PORTLESS_PORT.
"$PORTLESS" proxy start --no-tls --port "${PORTLESS_PORT}" >/dev/null 2>&1 || true

"$PORTLESS" alias "auth.${BRANCH_SLUG}" "${KEYCLOAK_PORT}"

pids=()
# Conductor stops the Run script with SIGHUP (then SIGKILL), so trap it too —
# otherwise the child Gradle/Vite processes are orphaned on stop.
trap 'echo; echo "Shutting down..."; kill "${pids[@]}" 2>/dev/null || true' INT TERM HUP

"$PORTLESS" "app.${BRANCH_SLUG}"       npm --prefix "$REPO_ROOT/services/shop/shop-frontend" run dev &
pids+=($!)
"$PORTLESS" "shop.${BRANCH_SLUG}"      "$REPO_ROOT/gradlew" -p "$REPO_ROOT" :services:shop:shop-backend:bootRun &
pids+=($!)
"$PORTLESS" "delivery.${BRANCH_SLUG}"  "$REPO_ROOT/gradlew" -p "$REPO_ROOT" :services:delivery:delivery-backend:bootRun &
pids+=($!)
"$PORTLESS" "warehouse.${BRANCH_SLUG}" "$REPO_ROOT/gradlew" -p "$REPO_ROOT" :services:warehouse:warehouse-backend:bootRun &
pids+=($!)
# shop-mcp-client runs in stdio mode (Spring AI MCP), not as an HTTP service —
# it is invoked directly by an MCP-aware client (e.g. Claude Desktop), not via
# the reverse proxy. Excluded from the parallel-dev stack on purpose.

wait
