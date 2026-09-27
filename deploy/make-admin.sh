#!/usr/bin/env bash
# Promote a registered account to admin, on the homelab: deploy/make-admin.sh someone@example.com
set -euo pipefail

email="${1:?usage: make-admin.sh email}"
dir="${DEPLOY_DIR:-$HOME/fpt-esporthub}"
cd "$dir"

echo "UPDATE \"User\" SET role = 'ADMIN' WHERE email = lower(:'email');" \
  | docker compose -f current/deploy/docker-compose.yml --env-file .env.production \
      exec -T db psql -U esporthub -d esporthub -v ON_ERROR_STOP=1 -v email="$email"
