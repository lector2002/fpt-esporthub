# Tech Stack Decision

## 1. Final Recommendation

FPT EsportHub should use a balanced large-ready web architecture:

```text
Frontend: Next.js
Backend: NestJS
Database: PostgreSQL
ORM: Prisma
Realtime: NestJS WebSocket Gateway, added progressively
Deploy: Vercel frontend + Railway/Render/Fly.io backend + Supabase/Neon Postgres
```

## 2. Why This Stack

Project requirements:

- Product should run for real users later, not only a class prototype.
- Closed beta target: 50-200 users.
- Team skill: full-stack balanced.
- Future chat requirement: full chat system, not only simple message board.
- Future phases include scrims, club tools, tournament operations, monetization, coaching, sponsorship, and livestream expansion.

This makes a separate backend worth the cost.

## 3. Stack Components

| Layer | Choice | Reason |
| --- | --- | --- |
| Frontend | Next.js | Strong React ecosystem, fast UI build, Vercel deploy, good SSR/SPA flexibility |
| Backend | NestJS | Modular architecture, good for large codebase, clean service/controller structure, WebSocket support |
| Database | PostgreSQL | Relational data fits users, teams, requests, tournaments, messages, reports |
| ORM | Prisma | Type-safe schema, migrations, developer speed |
| Auth | NestJS JWT or Auth.js integration | Need backend-controlled permissions for matching, chat, admin, moderation |
| Realtime | NestJS WebSocket Gateway | Future full chat system needs backend-controlled realtime behavior |
| Hosting | Vercel + Railway/Render/Fly.io | Easy split deploy for frontend/backend |
| DB Hosting | Supabase Postgres or Neon | Managed Postgres for beta |
| Cache/Queue | Redis later | Add in Phase 2+ for chat presence, notifications, queues, rate limiting |

## 4. Why Not Supabase-only

Supabase is still useful for managed PostgreSQL, but should not own all business logic.

Reasons:

- Matching logic will become custom.
- Match request state rules need server-side enforcement.
- Chat needs permission, block, moderation, and rate limiting.
- Tournament operations will become complex.
- Admin and reputation logic need clear service boundaries.

## 5. Monorepo Structure

Recommended structure:

```text
apps/
  web/                 # Next.js frontend
  api/                 # NestJS backend

packages/
  database/            # Prisma schema, migrations, seed scripts
  shared/              # Shared TypeScript types, enums, validation schemas
  config/              # Shared tsconfig/eslint config if needed

docs/
  architecture/
  phase-0/
  phase-1/
  phase-2/
  phase-3/
  phase-4/
```

Use this if the team is comfortable with monorepo tooling.

Simpler alternative:

```text
web/
api/
packages/
docs/
```

## 6. Phase-based Infrastructure

### Phase 1

Required:

- Next.js web app.
- NestJS REST API.
- PostgreSQL.
- Prisma migrations.
- JWT/session auth.
- Basic async messages through REST.
- Minimal admin dashboard.

Not required:

- Redis.
- WebSocket.
- Email service.
- File storage.
- Payment.

### Phase 2

Add when needed:

- WebSocket Gateway for realtime chat.
- Email service for Daily Matches digest.
- Redis for presence/rate limiting/notification queue.
- Public profile sharing.

### Phase 3

Add when needed:

- Tournament operation services.
- More robust admin and organizer permissions.
- Background jobs for tournament reminders and check-ins.

### Phase 4

Add when needed:

- Payment integration.
- Sponsorship analytics.
- Coaching marketplace workflows.
- Livestream/embed tracking.

## 7. Auth Recommendation

Use backend-controlled auth from the start.

Recommended Phase 1 approach:

- Email/password auth through NestJS.
- JWT access token + refresh token or secure session cookie.
- Role field: `user`, `admin`.
- Password hashing with bcrypt/argon2.

Google OAuth can be P2 unless the team needs it for demo polish.

Reason:

- Admin permissions, report handling, team captain permissions, and chat permissions are backend-owned.

## 8. Realtime Recommendation

Phase 1:

- Use REST for basic async chat.
- Messages appear after send/refresh or simple polling.

Phase 2:

- Add NestJS WebSocket Gateway.
- Keep same `Conversation` and `Message` database model.
- Add read receipts and typing only after basic realtime is stable.

This avoids overbuilding Phase 1 while keeping architecture ready.

## 9. Decision

Approved stack:

```text
Next.js + NestJS + PostgreSQL + Prisma + WebSocket-ready backend
```

Approved deployment direction:

```text
Frontend: Vercel
Backend: Railway/Render/Fly.io
Database: Supabase Postgres or Neon
```

## 10. AI Agent Model Routing

Approved routing:

| Task Type | Model |
| --- | --- |
| Frontend/UI implementation | `9router/vps/glm-5.2` |
| Backend implementation | existing coding model unless changed |
| Product/spec/research | `9router/mimo-v2.5-pro` unless changed |
| Orchestration/synthesis | current orchestrator |

Frontend/UI task examples:

- Next.js app shell.
- Landing page.
- Onboarding UI.
- Profile UI.
- Find Match UI.
- Team pages.
- Requests/chat UI.
- Admin UI.
