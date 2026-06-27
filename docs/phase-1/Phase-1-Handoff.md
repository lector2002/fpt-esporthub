# Phase 1 Handoff

> Status: Handoff ready
> Scope: Smart Team Finding MVP for Valorant and League of Legends student gamers

## What Is Ready

- Next.js frontend with Phase 1 routes.
- NestJS backend with auth, profile, lookups, teams, matching, match requests, conversations, tournaments, reports, blocks, reputation, and admin modules.
- PostgreSQL schema managed by Prisma.
- Local Docker PostgreSQL container `fpt-esporthub-postgres`.
- Seeded beta data for users, profiles, teams, events, match requests, conversation, message, and reputation.
- Login/register/onboarding connected to backend APIs.
- Frontend stores access token in `localStorage` key `fpt-esporthub-token`.
- Logout clears token and returns to `/login`.
- Protected API calls clear token and redirect to `/login?expired=1` on `401`.
- Global API rate limiting is enabled at 100 requests/minute.
- API smoke script and browser e2e tests exist.
- UI has an esports/arena visual direction focused on training, squad building, and competition.
- Requests and messages are accessible through a global floating `Squad Comms` bubble on every authenticated page.
- Clicking a request/message in the bubble opens an inline mini window for request handling or direct chat instead of redirecting away.
- Latest verification passed: `npm run db:generate`, `npm run typecheck`, `npm run build`, `npm run smoke:api`, `npm run e2e`.

## Local Setup

1. Start Docker Desktop.
2. Start database if stopped: `docker start fpt-esporthub-postgres`.
3. Generate Prisma client: `npm run db:generate`.
4. Run API: `npm run dev:api`.
5. Run web: `npm run dev:web`.
6. Open `http://localhost:3000`.

## Seed Accounts

- User: `minh@fpt.edu.vn` / `Password123!`
- Admin: `admin@fpt-esporthub.local` / `Password123!`

## Verification Commands

- Prisma client: `npm run db:generate`
- Typecheck: `npm run typecheck`
- Build: `npm run build`
- API smoke with API running: `npm run smoke:api`
- Browser e2e: `npm run e2e`
- Install e2e browser if needed: `npm run e2e:install`

## E2E Coverage

`e2e/phase1.spec.ts` covers:

- Seed user login.
- Dashboard live profile summary.
- Find player and team recommendations.
- Teams list.
- Events list.
- Requests list.
- Floating Requests/Messages bubble.
- Inline request accept/decline/cancel inside bubble.
- Inline quick chat inside bubble.
- Profile page.
- Logout redirect.
- New user registration.
- Onboarding submit.
- Dashboard after onboarding.

## API Smoke Coverage

`scripts/smoke-api.mjs` covers:

- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `GET /api/v1/profiles/me`
- `POST /api/v1/match/find`
- `GET /api/v1/teams`
- `GET /api/v1/tournaments`

Match count in smoke output may increase after browser e2e because the e2e suite registers additional beta users.

## Acceptance Criteria

- `npm run db:generate` passes.
- `npm run typecheck` passes.
- `npm run build` passes.
- `npm run smoke:api` passes with API server running.
- `npm run e2e` passes with Docker Postgres available.
- Seed account can log in and navigate core Phase 1 flow.
- New account can register and complete onboarding.

## Known Limits

- Chat is REST/basic async text, not WebSocket yet.
- No refresh token rotation yet; token expiry currently redirects to login on the next protected API `401`.
- No production deployment config yet.
- No Riot API integration yet; verification remains seed/self-reported/best-effort-ready.
- No payment, bracket automation, livestream, coaching, or Phase 2+ modules.
- Notification count in the floating bubble is frontend-derived from pending requests and unread conversations, not realtime push yet.
- Bubble mini chat uses current REST message send; realtime delivery remains Phase 2/WebSocket scope.

## Handoff Recommendation

Phase 1 is ready for stakeholder demo, user review, and handoff. Next work should be browser polish, UX copy refinement, and Phase 2 planning only after Phase 1 review feedback is captured.
