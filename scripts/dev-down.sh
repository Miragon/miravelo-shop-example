#!/usr/bin/env bash
# Stop the Compose stack for the current branch and clean up orphaned stacks.
# Local Gradle/Vite processes spawned via portless are managed by dev.sh's trap
# on Ctrl-C; this script only tears down the containers.
#
# Besides the current branch's stack, it sweeps every other retail-* compose
# project whose source compose file no longer exists on disk — i.e. stacks left
# running by a worktree/checkout that has since been deleted. Stacks belonging
# to live worktrees (compose file still present) are left running so parallel
# dev keeps working.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=dev-env.sh
source "$SCRIPT_DIR/dev-env.sh"

PORTLESS="$SCRIPT_DIR/node_modules/.bin/portless"

remove_alias() {
  # $1 = branch slug whose "auth.<slug>" portless alias should be removed.
  if [[ -x "$PORTLESS" ]]; then
    "$PORTLESS" alias --remove "auth.${1}" 2>/dev/null || true
  fi
}

# 1) Current branch's stack — compose file is present, so tear it down by file.
docker compose -p "$COMPOSE_PROJECT_NAME" -f "$REPO_ROOT/stack/docker-compose.yml" down --remove-orphans
remove_alias "$BRANCH_SLUG"

# 2) Orphan sweep: retail-* projects whose compose file is gone (deleted worktree).
#    docker compose ls reports the project name and its config file path(s); if
#    none of those paths still exist, no live checkout owns the stack anymore.
while IFS=$'\t' read -r name config_files; do
  [[ "$name" == retail-* ]] || continue
  [[ "$name" == "$COMPOSE_PROJECT_NAME" ]] && continue

  alive=0
  IFS=',' read -ra paths <<<"$config_files"
  for p in "${paths[@]}"; do
    [[ -f "$p" ]] && { alive=1; break; }
  done
  [[ "$alive" -eq 1 ]] && continue

  echo "Cleaning orphaned stack '${name}' (source compose file no longer exists)..."
  docker compose -p "$name" down --remove-orphans
  remove_alias "${name#retail-}"
done < <(docker compose ls -a --format json | jq -r '.[] | [.Name, .ConfigFiles] | @tsv')
