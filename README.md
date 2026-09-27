# FPT EsportHub

Smart Team Finding MVP for Vietnamese student gamers playing Valorant and League of Legends.

## Stack

- Frontend: Next.js in `apps/web`
- Backend: NestJS in `apps/api`
- Database: PostgreSQL + Prisma in `packages/database`
- Shared types/enums: `packages/shared`

## Setup

```powershell
npm install
npm run db:generate
npm run dev:web
npm run dev:api
```

## Test Accounts

Created by `packages/database/prisma/seed.ts` for local dev (http://localhost:3000) and the local production stack (http://localhost:8080). All use the password `Password123!`. Never seed these on a public deploy.

| Email | Name | Use it to test |
| --- | --- | --- |
| `minh@fpt.edu.vn` | MinhNguyen | Main player: Valorant (Gold 2 Duelist) and LoL (Silver 1 Jungle) profiles, Find Match, teams, wallet |
| `khoa@fpt.edu.vn` | KhoaSentinel | Valorant coach (sessions and reviews from other players) |
| `anhtu@fpt.edu.vn` | AnhTuSupport | LoL coach, LoL Support player |
| `linh@fpt.edu.vn` | LinhMid | LoL Mid player |
| `hieu@fpt.edu.vn` | HieuSniper | Valorant Initiator player |
| `venue@fpt-esporthub.local` | CyberCoreHoaLac | Internet cafe host: venue, offline cups, check-in desk |
| `admin@fpt-esporthub.local` | Admin | Admin panel (`/admin`): users, reports, credits, events, venues |

## Production

Live at https://fptesporthub.io.vn, served from the homelab through a Cloudflare Tunnel. Ship a new release with `bash deploy/deploy.sh homelab-an`; runbook in `deploy/README.md`.

Admin account: the email and password are in `.env.admin` at the repo root on the owner's machine. That file is gitignored and never committed, because this repo is public. Change the password after the first sign-in.
