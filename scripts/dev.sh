#!/usr/bin/env bash
# Parallel-dev for the portless setup — one isolated stack per git branch.
#
#   ./dev.sh up     start Compose (Postgres + Keycloak) + all services via portless
#   ./dev.sh down   stop this branch's stack and sweep stacks from deleted worktrees
#
# Why a script and not portless's own config: portless only auto-discovers JS
# workspace packages, while this stack is Gradle/Spring + Compose. See
# docs/how-to/portless-parallel-development.md.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PORTLESS="$SCRIPT_DIR/node_modules/.bin/portless"
COMPOSE_FILE="$REPO_ROOT/stack/docker-compose.yml"
FRONTEND_DIR="$REPO_ROOT/services/shop/shop-frontend"

# Everything that must differ per branch, derived from the git branch so two
# checkouts never collide on ports, Compose projects, or URLs.
derive_env() {
  BRANCH_SLUG="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD | tr '/_' '--' | tr '[:upper:]' '[:lower:]')"
  : "${BRANCH_SLUG:?not inside a git repository?}"

  # Hash the slug into deterministic host ports so parallel worktrees never
  # fight over the same Postgres/Keycloak port.
  local hash
  hash="$(echo -n "$BRANCH_SLUG" | cksum | cut -d ' ' -f1)"
  export BRANCH_SLUG
  export POSTGRES_PORT=$((15000 + hash % 1000))
  export KEYCLOAK_PORT=$((16000 + hash % 1000))
  export COMPOSE_PROJECT_NAME="miravelo-${BRANCH_SLUG}"

  # Plain HTTP on an unprivileged port keeps the setup sudo-free (portless
  # defaults to HTTPS on :443, which elevates).
  export PORTLESS_HTTPS=0
  export PORTLESS_PORT=1355
  export PORTLESS_SYNC_HOSTS=0

  # Branch-unique URLs the services hand each other and the browser.
  local suffix=".${BRANCH_SLUG}.localhost:${PORTLESS_PORT}"
  export ISSUER_URI="http://auth${suffix}/realms/miravelo"
  export SHOP_BACKEND_URL="http://shop${suffix}"
  export CORS_ALLOWED_ORIGINS="http://app${suffix}"
  export KEYCLOAK_HOSTNAME="http://auth${suffix}"
  export APP_ORIGIN="http://app${suffix}"
  export KC_RELATIVE_PATH=/        # portless gives Keycloak its own host → root path
  export SWAGGER_API_ENABLED=true

  export DATABASE_URL="jdbc:postgresql://localhost:${POSTGRES_PORT}/test"
  export DATABASE_USER=test
  export DATABASE_PASSWORD=test
  export DATABASE_DRIVER_CLASS_NAME=org.postgresql.Driver
  export DATABASE_DIALECT=org.hibernate.dialect.PostgreSQLDialect
  export DATABASE_SAMPLE_DATA_ENABLED=true

  # Let portless assign each backend an ephemeral PORT (the dev profile pins one).
  unset SPRING_PROFILES_ACTIVE
}

remove_alias() {
  [[ -x "$PORTLESS" ]] && "$PORTLESS" alias --remove "auth.${1}" 2>/dev/null || true
}

# --- up ---------------------------------------------------------------------

up() {
  install_missing_dependencies
  print_entrypoints
  docker compose -f "$COMPOSE_FILE" up -d --wait
  start_proxy
  "$PORTLESS" alias "auth.${BRANCH_SLUG}" "$KEYCLOAK_PORT"   # route the Keycloak container
  run_services
}

install_missing_dependencies() {
  if [[ ! -x "$PORTLESS" ]]; then
    echo "Installing dev-script dependencies (one-time)..."
    npm --prefix "$SCRIPT_DIR" install
  fi
  if [[ ! -x "$FRONTEND_DIR/node_modules/.bin/vite" ]]; then
    echo "Installing frontend dependencies (one-time)..."
    npm --prefix "$FRONTEND_DIR" install
  fi
}

print_entrypoints() {
  cat <<EOF
Starting parallel dev for branch '${BRANCH_SLUG}':
  postgres   localhost:${POSTGRES_PORT}
  keycloak   http://auth.${BRANCH_SLUG}.localhost:1355     (compose-host port ${KEYCLOAK_PORT})
  frontend   http://app.${BRANCH_SLUG}.localhost:1355
  shop       http://shop.${BRANCH_SLUG}.localhost:1355
  delivery   http://delivery.${BRANCH_SLUG}.localhost:1355
  warehouse  http://warehouse.${BRANCH_SLUG}.localhost:1355
EOF
}

start_proxy() {
  "$PORTLESS" proxy start --no-tls --port "$PORTLESS_PORT" >/dev/null 2>&1 || true
  "$PORTLESS" prune >/dev/null 2>&1 || true   # reap routes leaked by crashed sessions
}

# Run each service behind portless, which injects a free PORT and routes
# <name>.<branch>.localhost to it (Spring binds server.port=${PORT:8080}, Vite
# reads PORT). shop-mcp-client is stdio-only, so it has no HTTP route.
run_services() {
  local gradlew=("$REPO_ROOT/gradlew" -p "$REPO_ROOT")
  local pids=()

  # Conductor stops the run script with SIGHUP/SIGKILL; forward it so the child
  # Gradle/Vite processes shut down with it.
  trap 'echo; echo "Shutting down..."; kill "${pids[@]}" 2>/dev/null || true' INT TERM HUP

  "$PORTLESS" "app.${BRANCH_SLUG}"       npm --prefix "$FRONTEND_DIR" run dev &                       pids+=($!)
  "$PORTLESS" "shop.${BRANCH_SLUG}"      "${gradlew[@]}" :services:shop:shop-backend:bootRun &        pids+=($!)
  "$PORTLESS" "delivery.${BRANCH_SLUG}"  "${gradlew[@]}" :services:delivery:delivery-backend:bootRun &   pids+=($!)
  "$PORTLESS" "warehouse.${BRANCH_SLUG}" "${gradlew[@]}" :services:warehouse:warehouse-backend:bootRun & pids+=($!)
  wait
}

# --- down -------------------------------------------------------------------

down() {
  docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" down --remove-orphans
  remove_alias "$BRANCH_SLUG"

  sweep_orphaned_stacks
  [[ -x "$PORTLESS" ]] && "$PORTLESS" prune >/dev/null 2>&1 || true
  stop_proxy_unless_others_running
}

# Tear down branch stacks whose worktree is gone; live worktrees keep their
# stacks running, which is what makes parallel dev possible.
sweep_orphaned_stacks() {
  local name config_files
  while IFS=$'\t' read -r name config_files; do
    [[ "$name" == miravelo-* && "$name" != "$COMPOSE_PROJECT_NAME" ]] || continue
    stack_is_orphaned "$config_files" || continue
    echo "Removing orphaned stack '${name}' (its worktree is gone)..."
    docker compose -p "$name" down --remove-orphans
    remove_alias "${name#miravelo-}"
  done < <(docker compose ls -a --format json | jq -r '.[] | [.Name, .ConfigFiles] | @tsv')
}

# A stack is orphaned when none of the Compose files it was created from exist.
stack_is_orphaned() {
  local path paths
  IFS=',' read -ra paths <<<"$1"
  for path in "${paths[@]}"; do
    [[ -f "$path" ]] && return 1
  done
  return 0
}

# The proxy is shared across worktrees — only stop it when none are left.
stop_proxy_unless_others_running() {
  local remaining
  remaining="$(docker compose ls -a --format json | jq -r '.[].Name' | grep -c '^miravelo-' || true)"
  [[ "${remaining:-0}" -eq 0 && -x "$PORTLESS" ]] || return 0
  echo "Last branch stack torn down — stopping the shared portless proxy."
  "$PORTLESS" proxy stop --port "$PORTLESS_PORT" >/dev/null 2>&1 || true
}

# --- dispatch ---------------------------------------------------------------

derive_env
case "${1:-}" in
  up)   up ;;
  down) down ;;
  *)    echo "usage: $(basename "$0") {up|down}" >&2; exit 1 ;;
esac
