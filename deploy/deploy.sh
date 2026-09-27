#!/usr/bin/env bash
# Ship the current source to the homelab as a new release and (re)start the stack.
# Usage (from the repo root, Git Bash or any POSIX shell): deploy/deploy.sh user@host [remote_dir]
set -euo pipefail

host="${1:?usage: deploy/deploy.sh user@host [remote_dir]}"
dir="${2:-fpt-esporthub}"
release="$(date +%Y%m%d-%H%M%S)"
cd "$(dirname "$0")/.."

if ! ssh "$host" "test -f ~/$dir/.env.production"; then
  echo "Missing ~/$dir/.env.production on $host. Create it from deploy/.env.production.example first." >&2
  exit 1
fi

echo "Uploading release $release"
tar -czf - \
  --exclude=node_modules --exclude=.next --exclude=dist --exclude='*.tsbuildinfo' \
  --exclude=.env --exclude=.env.local --exclude=.env.production \
  package.json package-lock.json tsconfig.base.json .dockerignore apps packages deploy \
  | ssh "$host" "mkdir -p ~/$dir/releases/$release && tar -xzf - -C ~/$dir/releases/$release && chmod +x ~/$dir/releases/$release/deploy/*.sh && ln -sfn releases/$release ~/$dir/current"

echo "Building and starting"
ssh "$host" "cd ~/$dir && docker compose -f current/deploy/docker-compose.yml --env-file .env.production --profile tunnel up -d --build --remove-orphans && docker compose -f current/deploy/docker-compose.yml --env-file .env.production --profile tunnel ps"
