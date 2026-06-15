#!/usr/bin/env bash
# Stop the Compose stack for the current branch. Local Gradle/Vite processes
# spawned via portless are managed by dev.sh's trap on Ctrl-C; this script
# only tears down the containers.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=dev-env.sh
source "$SCRIPT_DIR/dev-env.sh"

PORTLESS="$SCRIPT_DIR/node_modules/.bin/portless"

docker compose -p "$COMPOSE_PROJECT_NAME" -f "$REPO_ROOT/stack/docker-compose.yml" down --remove-orphans

if [[ -x "$PORTLESS" ]]; then
  "$PORTLESS" alias --remove "auth.${BRANCH_SLUG}" 2>/dev/null || true
fi
