#!/usr/bin/env bash
# Database dump plus uploaded pictures on the homelab, keeping the newest 14 of each. Cron example (daily 03:15):
#   15 3 * * * ~/fpt-esporthub/current/deploy/backup.sh >> ~/fpt-esporthub/backups/backup.log 2>&1
# Restore: docker compose ... exec -T db pg_restore -U esporthub -d esporthub --clean --if-exists < backups/<file>.dump
#          docker compose ... exec -T api tar -xzf - -C /data/uploads < backups/<file>.tar.gz
set -euo pipefail

dir="${DEPLOY_DIR:-$HOME/fpt-esporthub}"
cd "$dir"
mkdir -p backups

compose() {
  docker compose -f current/deploy/docker-compose.yml --env-file .env.production "$@"
}

stamp="$(date +%Y%m%d-%H%M%S)"
file="backups/esporthub-$stamp.dump"
compose exec -T db pg_dump -U esporthub -d esporthub --format=custom > "$file"
echo "Wrote $file ($(du -h "$file" | cut -f1))"

media="backups/uploads-$stamp.tar.gz"
compose exec -T api tar -czf - -C /data/uploads . > "$media"
echo "Wrote $media ($(du -h "$media" | cut -f1))"

ls -1t backups/esporthub-*.dump | tail -n +15 | xargs -r rm --
ls -1t backups/uploads-*.tar.gz | tail -n +15 | xargs -r rm --
