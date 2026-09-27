# Homelab deploy

One Linux host with Docker runs everything: Postgres, API, web, a Caddy router and `cloudflared`.
No port is opened on the host or router; public traffic arrives through a Cloudflare Tunnel, so CGNAT is fine.

```
browser -> Cloudflare -> tunnel -> proxy:80 -> /api/*, /socket.io/*  -> api:4000
                                            -> everything else      -> web:3000
```

Layout on the host (default `~/fpt-esporthub`):

```
.env.production      secrets, created by hand, never uploaded by deploy.sh
releases/<stamp>/    one folder per deploy
current -> releases/<stamp>
backups/             pg_dump files and uploaded pictures from backup.sh
```

## First deploy

1. Cloudflare
   - Add the domain to Cloudflare (nameservers moved there).
   - Zero Trust > Networks > Tunnels > Create tunnel (type Cloudflared), name it `esporthub`.
   - Public hostname: `<your domain>`, service `HTTP`, URL `proxy:80`.
   - Copy the tunnel token for the next step.
2. Secrets on the host
   ```sh
   mkdir -p ~/fpt-esporthub && cd ~/fpt-esporthub
   # paste deploy/.env.production.example into .env.production, then fill it in
   chmod 600 .env.production
   openssl rand -hex 32   # run once each for POSTGRES_PASSWORD and JWT_SECRET
   ```
   `PUBLIC_URL` must be the exact `https://` origin of the tunnel hostname. It is baked into the web build, so changing it needs a redeploy.
3. From the repo root on your machine (SSH key auth over Tailscale):
   ```sh
   deploy/deploy.sh user@homelab
   ```
   The API container applies pending migrations on start.
4. Open the site, register your own account, then on the host:
   ```sh
   ~/fpt-esporthub/current/deploy/make-admin.sh you@example.com
   ```
   Sign out and back in to pick up the admin role.

Never run `db:seed` against production: it creates test accounts with known passwords.

## Routine

| Task | Command |
|------|---------|
| Update | `deploy/deploy.sh user@homelab` |
| Status | `cd ~/fpt-esporthub && docker compose -f current/deploy/docker-compose.yml --env-file .env.production --profile tunnel ps` |
| Logs | same, with `logs -f --tail=200 api` (or `web`, `cloudflared`) |
| Backup now | `~/fpt-esporthub/current/deploy/backup.sh` |

Daily backups at 03:15 (`crontab -e`):

```
15 3 * * * ~/fpt-esporthub/current/deploy/backup.sh >> ~/fpt-esporthub/backups/backup.log 2>&1
```

`backup.sh` keeps the newest 14 dumps and 14 archives of uploaded pictures (the `uploads` volume). Copy `backups/` off the host now and then; a dump on the same disk does not survive a dead disk.

Restore a dump (replaces current data):

```sh
cd ~/fpt-esporthub
docker compose -f current/deploy/docker-compose.yml --env-file .env.production \
  exec -T db pg_restore -U esporthub -d esporthub --clean --if-exists < backups/<file>.dump
```

Restore uploaded pictures from the archive taken at the same time:

```sh
docker compose -f current/deploy/docker-compose.yml --env-file .env.production \
  exec -T api tar -xzf - -C /data/uploads < backups/uploads-<stamp>.tar.gz
```

## Rollback

```sh
cd ~/fpt-esporthub
ls releases
ln -sfn releases/<older stamp> current
docker compose -f current/deploy/docker-compose.yml --env-file .env.production --profile tunnel up -d --build
```

Migrations only move forward. If the newer release changed the schema, restore the backup taken before it as well.

Old releases are not pruned automatically. Remove folders you no longer need from `releases/` by name, one at a time.

## External services

- Email (Resend): verify the domain used in `EMAIL_FROM` in the Resend dashboard, or sign-up and reset emails are rejected.
- Riot API: a development key expires every 24 hours. Apply for a personal or production key before launch, then update `RIOT_API_KEY` and redeploy.
- Voice relay (TURN): the tunnel only carries HTTP, so coturn cannot run behind it. Use Cloudflare Realtime TURN instead: in the Cloudflare dashboard open Realtime > TURN, create a TURN key, and put its key id and API token in `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_API_TOKEN`. The first 1,000 GB per month are free (shared with the SFU), then $0.05/GB egress; a relayed player in a full 5-person room uses about 0.22 GB per hour. Without it, direct peer connections fail for some players on strict networks (common on 4G). Self-hosted coturn (`TURN_URLS` + `TURN_SECRET`) still works on a host with a public IP.

## Local check of the production images

```sh
docker compose -p fpt-esporthub-test -f deploy/docker-compose.yml -f deploy/docker-compose.local.yml \
  --env-file <throwaway env> up -d --build
```

Serves on `http://localhost:8080` without the tunnel. Tear it down with the same command and `down -v`.
