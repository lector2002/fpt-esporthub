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

## Key Docs

- `AI-CONTEXT.md`
- `docs/README.md`
- `docs/architecture/Tech-Stack.md`
- `docs/architecture/System-Architecture.md`
- `docs/phase-1/MVP-Build-Spec.md`
- `docs/phase-1/Engineering-Tickets.md`
- `docs/phase-1/Sprint-Plan.md`

## Phase 1 Core Loop

```text
Register -> Onboarding/Profile -> Find Match -> Send Request -> Accept -> Basic Async Chat
```
