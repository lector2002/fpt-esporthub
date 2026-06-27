# AI Context

> Updated: 2026-06-27
> Level: Large
> Status: active

## Project

One-liner: FPT EsportHub is a large phased product/codebase project for EXE101, starting as a Smart Team Finding MVP for Vietnamese student gamers playing Valorant and League of Legends, then expanding into scrims, club tools, tournament operations, premium, coaching, sponsorship, and livestream monetization.

## Current State

Phase 1 is mostly handoff-ready for local stakeholder demo, with one active UI-polish thread in progress. Backend uses NestJS modules with shared `PrismaService` and global throttling; frontend has an esports/arena-styled Next.js UI connected through `apps/web/lib/api.ts`; Docker PostgreSQL is running locally via `fpt-esporthub-postgres`; Prisma migration/seed have been applied; login/register/onboarding store/use `fpt-esporthub-token`; app nav supports logout/token cleanup; Requests/Messages are available through a global floating `Squad Comms` bubble with inline request handling and mini chat; browser e2e covers seeded-user and new-user core flows. Current active work: Vietnamese interface switch was started and GLM per-screen UI retry is ongoing.

## Done

- [x] Read original checkpoint report at `docs/Group 1 - FPT Esport Hub - Checkpoint 3 - Report.md`.
- [x] Chose MVP wedge: Team finding.
- [x] Chose primary MVP user: solo student gamers.
- [x] Chose first games: Valorant and League of Legends.
- [x] Chose matching model: Hybrid Smart Matchmaking with instant recommendations and Daily Matches.
- [x] Chose MVP modules: player profile, real team profile, match request, basic messages, tournament event listing, find team for tournament, safety basics, admin dashboard.
- [x] Created product planning doc at `docs/FPT-EsportHub-Product-Structure-and-Phase-Plan.md`.
- [x] Created initial subagent handoff doc at `docs/FPT-EsportHub-Subagent-Handoff-Tasks.md`.
- [x] Created phase-based handoff doc at `docs/FPT-EsportHub-Phase-Based-Agent-Handoffs.md`.
- [x] Created `.swarm/` workspace and convoy registry.
- [x] Completed Wave 1 agents: PRD Refinement, Competitor Research, UX Flow Discovery, Phase Architecture.
- [x] Completed Wave 2 agents: Matching Logic, Data Model, Admin/Moderation, Riot Verification.
- [x] Completed Wave 3 agents: API Spec, Wireframe Spec, QA/Beta Readiness, Technical Risk Review.
- [x] Created synthesis at `.swarm/synthesis.md`.
- [x] User approved final cutline updates: email digest Phase 2, public reputation in Phase 1, basic async chat in Phase 1, Riot best-effort fallback approved, create MVP Build Spec.
- [x] Restructured docs into phase folders under `docs/phase-0/` through `docs/phase-4/`.
- [x] Created main Phase 1 spec at `docs/phase-1/MVP-Build-Spec.md`.
- [x] Created Phase 1 engineering tickets at `docs/phase-1/Engineering-Tickets.md`.
- [x] Created Phase 1 sprint plan at `docs/phase-1/Sprint-Plan.md`.
- [x] Chose approved tech stack: Next.js frontend + NestJS backend + PostgreSQL + Prisma, WebSocket-ready for Phase 2.
- [x] Created architecture docs at `docs/architecture/Tech-Stack.md` and `docs/architecture/System-Architecture.md`.
- [x] User decided frontend/UI implementation tasks should use `9router/vps/glm-5.2` model.
- [x] Initialized monorepo scaffold with `apps/web`, `apps/api`, `packages/database`, and `packages/shared`.
- [x] Installed npm workspace dependencies and generated Prisma client.
- [x] Verified `@fpt-esporthub/shared` and `@fpt-esporthub/api` builds; `apps/web/.next/` build artifact exists.
- [x] Implemented Phase 1 foundation modules using worker/reviewer workflow.
- [x] All module reviewers passed: Auth, Profile/Lookups, Team/Matching/Requests, Frontend Shell, Chat/Events, Safety/Admin/Reputation.
- [x] Final orchestrator verification passed: `npm run db:generate`, `npm run typecheck`, `npm run build`.
- [x] Refactored backend services to shared NestJS `PrismaService`; no direct `new PrismaClient()` remains under `apps/api/src`.
- [x] Added frontend API boundary at `apps/web/lib/api.ts` and connected dashboard, profile, matching, teams, requests, conversations, and events pages through API helpers with mock fallback.
- [x] Re-verified after integration: `npm run db:generate`, `npm run typecheck`, `npm run build`.
- [x] Started local PostgreSQL in Docker container `fpt-esporthub-postgres` using `postgres:16-alpine`.
- [x] Created local `.env` from `.env.example` values; `.env` is gitignored.
- [x] Ran first Prisma migration: `packages/database/prisma/migrations/20260627043307_init/migration.sql`.
- [x] Expanded and ran seed data for beta users/profiles/teams/events/requests/conversation/message/reputation.
- [x] Connected login/register/onboarding frontend flows to backend auth/profile APIs and `localStorage` token persistence.
- [x] Fixed API runtime packaging so compiled NestJS API starts with workspace packages.
- [x] Verified compiled live API smoke: health OK, login as `minh@fpt.edu.vn`, profile OK, 2 player matches, 3 teams, 2 events.
- [x] Final verification passed: `npm run db:generate`, `npm run typecheck`, `npm run build`.
- [x] Added frontend logout/token cleanup in app navigation.
- [x] Added global API rate limiting via `@nestjs/throttler` at 100 requests/minute.
- [x] Added automated smoke script `scripts/smoke-api.mjs` and root command `npm run smoke:api`.
- [x] Re-verified: `npm run db:generate`, `npm run typecheck`, `npm run build`, and `npm run smoke:api` against compiled API.
- [x] Added session expiry handling: protected API `401` clears token and redirects to `/login?expired=1`.
- [x] Added Playwright browser e2e tests in `e2e/phase1.spec.ts`.
- [x] Added Phase 1 handoff/runbook at `docs/phase-1/Phase-1-Handoff.md`.
- [x] Final handoff verification passed: `npm run db:generate`, `npm run typecheck`, `npm run build`, `npm run smoke:api`, `npm run e2e`.
- [x] Refreshed UI toward engaging esports/arena visual language with stronger neon colors, cards, hero visuals, and training/squad-building copy.
- [x] Moved Requests/Messages access into global floating `Squad Comms` bubble with notification badge.
- [x] Re-verified after UI refresh: `npm run typecheck`, `npm run build`, `npm run e2e`, `npm run smoke:api`.
- [x] Updated `Squad Comms` bubble so clicking requests/messages opens inline detail/chat mini windows instead of redirecting.
- [x] Re-verified after inline bubble interaction: `npm run typecheck`, `npm run build`, `npm run e2e`, `npm run smoke:api`.
- [x] Created review note file: `docs/phase-1/Phase-1-Review-Notes.md`.
- [x] Started Vietnamese interface support with `apps/web/lib/i18n.ts` and a language switch on `/profile/me`.
- [x] Applied Vietnamese labels to major app UI areas: nav, dashboard, profile, find match, teams, events, requests, conversations, and `Squad Comms` bubble.
- [x] GLM screen-by-screen UI work started. GLM successfully rewrote landing `apps/web/app/page.tsx`; CSS was manually completed afterward because GLM timed out before styling/typecheck.
- [x] Web typecheck passed after initial i18n fixes: `npm run typecheck --workspace @fpt-esporthub/web`.

## Now

- Local app is currently running for user review at `http://localhost:3000`; API health at `http://localhost:4000/api/v1/health`.
- Phase 1 core product is ready, but UI polishing is still active because user requested GLM to revise each screen one-by-one.
- Active caveat: after starting i18n + GLM landing edits, full `npm run build`/`npm run e2e` should be rerun before final handoff because only web typecheck has been confirmed after those latest edits.
- Known remaining product hardening: refresh token rotation, production deployment config, Riot API integration, WebSocket chat in Phase 2.

## Next

1. Continue GLM per-screen UI retry as requested by user.
2. Finish Vietnamese interface coverage and verify switch behavior from `/profile/me`.
3. Run final verification after UI/i18n work: `npm run typecheck`, `npm run build`, `npm run e2e`, `npm run smoke:api`.
4. User/stakeholder run-through of local demo.
5. Capture Phase 1 review feedback and decide deployment vs Phase 2 planning.

## Key Files

- `AI-CONTEXT.md` - source of truth for current project state.
- `docs/Group 1 - FPT Esport Hub - Checkpoint 3 - Report.md` - original EXE101 checkpoint report.
- `docs/FPT-EsportHub-Product-Structure-and-Phase-Plan.md` - current product PRD, phase plan, backlog, and data model direction.
- `docs/FPT-EsportHub-Subagent-Handoff-Tasks.md` - initial task handoff catalog.
- `docs/FPT-EsportHub-Phase-Based-Agent-Handoffs.md` - phase-based orchestration handoff plan.
- `docs/README.md` - docs index and read order.
- `docs/decisions/DECISIONS.md` - approved decision log.
- `docs/phase-1/MVP-Build-Spec.md` - main Phase 1 implementation spec.
- `docs/phase-1/Phase-1-Handoff.md` - Phase 1 runbook, verification, and handoff acceptance criteria.
- `docs/phase-1/Phase-1-Review-Notes.md` - user review note template for bugs, UX polish, copy, and final acceptance.
- `docs/phase-1/Engineering-Tickets.md` - Phase 1 execution tickets.
- `docs/phase-1/Sprint-Plan.md` - sprint plan and build cutline.
- `docs/architecture/Tech-Stack.md` - approved stack and deployment direction.
- `docs/architecture/System-Architecture.md` - module map, data flow, permissions.
- `package.json` - npm workspace scripts.
- `apps/web/` - Next.js frontend scaffold.
- `apps/web/lib/api.ts` - frontend API/fallback boundary for Phase 1 pages.
- `apps/api/` - NestJS backend scaffold.
- `packages/database/` - Prisma schema and seed scaffold.
- `packages/shared/` - shared enums/types scaffold.
- `.swarm/convoy.json` - active swarm registry.
- `.swarm/agents/*/task.md` - full prompts for AI subagents.
- `.swarm/agents/*/output.md` - generated outputs from AI subagents.
- `.swarm/messages/*/findings.md` - intermediate findings and peer messages.
- `.swarm/synthesis.md` - final synthesis after agent waves.
- `.swarm/phase-1-implementation-synthesis.md` - implementation synthesis after worker/reviewer flow.

## Commands

- Install: `npm install`
- Dev web: `npm run dev:web`
- Dev API: `npm run dev:api`
- Start local DB if stopped: `docker start fpt-esporthub-postgres`
- Local demo login: `minh@fpt.edu.vn` / `Password123!`
- Local admin login: `admin@fpt-esporthub.local` / `Password123!`
- Generate Prisma client: `npm run db:generate`
- Typecheck: `npm run typecheck`
- Build: `npm run build`
- Smoke API with API server running: `npm run smoke:api`
- Browser e2e: `npm run e2e`
- Dispatch one agent: `opencode run "$(Get-Content -Raw .swarm/agents/agent-01/task.md)" --model 9router/mimo-v2.5-pro --dir . > .swarm/agents/agent-01/output.md 2>&1`
- Dispatch GLM screen task example: `opencode run "$(Get-Content -Raw .swarm/agents/glm-screen-01-landing-only/task.md)" --model 9router/vps/glm-5.2 --dir .`

## Decisions

- 2026-06-26: Project level set to Large because the user clarified this is a large codebase project with many phases and features.
- 2026-06-26: MVP narrowed to Team Finding to avoid overbuilding the all-in-one ecosystem before validating demand.
- 2026-06-26: First games are Valorant and League of Legends because both have structured rank/role behavior and fit student esports.
- 2026-06-26: Smart Matchmaking MVP will be rule-based, not ML-based, to keep Phase 1 build realistic.
- 2026-06-26: All swarm worker agents should use `9router/mimo-v2.5-pro` unless the user changes routing.
- 2026-06-26: Completed 12-agent Phase 0/1 swarm. Synthesis recommends Phase 1 cutline: core loop P0, email digest/reputation public badge/Premium waitlist can move later.
- 2026-06-26: User decided email digest moves to Phase 2.
- 2026-06-26: User decided reputation is public in Phase 1; implementation should use simple badge/tier publicly, numeric details admin-only.
- 2026-06-26: User decided Phase 1 chat is basic async text messaging.
- 2026-06-26: User approved Riot verification as best-effort with fallback.
- 2026-06-26: User clarified product should run for real users later, may need full realtime chat, team is full-stack balanced, closed beta target. Approved stack: Next.js + NestJS + PostgreSQL + Prisma with WebSocket-ready backend.
- 2026-06-27: User requested worker/reviewer workflow for modules, with reviewer using `9router/mimo-v2.5-pro`; orchestrator only checks final flow after modules are complete.
- 2026-06-27: Phase 1 foundation implementation completed with reviewer PASS across all modules.
- 2026-06-27: User requested immediate clarification questions whenever information/scope/behavior is unclear during implementation.
- 2026-06-27: PrismaService refactor and frontend API boundary integration completed; mock data is retained only behind `apps/web/lib/api.ts` as fallback until DB/auth are configured.
- 2026-06-27: User chose Docker Desktop for local PostgreSQL setup.
- 2026-06-27: Local demo DB, migration, seed, auth token persistence, onboarding API submit, compiled API smoke test, typecheck, and build completed.
- 2026-06-27: Added logout/token cleanup, global API throttling, and reusable API smoke script.
- 2026-06-27: Added session-expiry UX, Playwright browser e2e, and Phase 1 handoff runbook. Full handoff verification passed.
- 2026-06-27: User requested more engaging esports UI/UX and global chat/request bubble. Implemented arena visual refresh and floating `Squad Comms` bubble with notification count.
- 2026-06-27: User requested bubble interactions stay in-place. Implemented inline request detail/actions and inline mini chat in `Squad Comms`.
- 2026-06-27: User requested a review notes file. Created `docs/phase-1/Phase-1-Review-Notes.md`.
- 2026-06-27: User requested Vietnamese interface version and switch in profile. Implemented initial `lib/i18n.ts`, profile language switch, and translated main app UI labels. Needs final full build/e2e after all screen polish.
- 2026-06-27: User requested GLM for per-screen UI/UX edits. Multiple large GLM jobs timed out; user chose to keep retrying GLM. Smaller GLM task successfully edited landing `page.tsx`; manual CSS completion was added because GLM timed out before CSS/typecheck.
- 2026-06-26: Frontend/UI implementation tasks should be routed to `9router/vps/glm-5.2`; backend/spec/research tasks keep existing routing unless changed.

## Project Timeline

### Phase 0/Planning

- Started from original EXE101 checkpoint report in `docs/Group 1 - FPT Esport Hub - Checkpoint 3 - Report.md`.
- Narrowed product from broad all-in-one esports platform to Phase 1 Smart Team Finding MVP.
- Chose first MVP users: Vietnamese/FPT student solo gamers.
- Chose first supported games: Valorant and League of Legends.
- Ran 12 planning agents using `9router/mimo-v2.5-pro` for PRD, competitor research, UX, architecture, matching, data model, admin/moderation, Riot verification, API spec, wireframes, QA, and risk review.
- Synthesized planning outputs into `.swarm/synthesis.md`.

### Specs/Architecture

- Created phase docs under `docs/phase-0/` through `docs/phase-4/`.
- Created Phase 1 build spec, engineering tickets, sprint plan, architecture docs, and decision log.
- Locked decisions: email digest Phase 2, reputation public as simple badge/tier, chat Phase 1 REST/basic async, Riot verification best-effort fallback.
- Approved stack: Next.js + NestJS + PostgreSQL + Prisma.

### Monorepo Foundation

- Initialized npm workspaces with `apps/web`, `apps/api`, `packages/database`, and `packages/shared`.
- Added root scripts for install/dev/build/typecheck/db generate/migrate/seed/smoke/e2e.
- Added `.env.example`, `.gitignore`, `tsconfig.base.json`, and root README.

### Backend Phase 1

- Implemented NestJS modules: auth, profiles, lookups, teams, matching, match-requests, conversations, tournaments, reports, blocks, reputation, admin.
- Auth hashes passwords with bcrypt and excludes `passwordHash` from responses.
- `JWT_SECRET` is required with no hardcoded fallback.
- Refactored services to shared NestJS `PrismaService`.
- Added global API throttling with `@nestjs/throttler` at 100 requests/minute.
- Added session-expiry behavior from frontend on protected API `401`.

### Database/Seed

- Started Docker PostgreSQL container `fpt-esporthub-postgres` using `postgres:16-alpine`.
- Created local `.env` with `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL`, `PORT`.
- Ran Prisma migration `20260627043307_init`.
- Seeded beta users, profiles, teams, events, requests, conversation, message, and reputation.
- Demo accounts: `minh@fpt.edu.vn` / `Password123!`, `admin@fpt-esporthub.local` / `Password123!`.

### Frontend Phase 1

- Built app routes: landing, login, register, onboarding, dashboard, profile, find-match, requests, teams, events, conversations.
- Added `apps/web/lib/api.ts` API/fallback boundary.
- Connected login/register/onboarding to backend and persisted JWT in `localStorage` key `fpt-esporthub-token`.
- Added logout in app nav and session-expiry redirect to `/login?expired=1`.
- Added floating `Squad Comms` bubble replacing primary nav access for Requests/Messages.
- Bubble shows pending/unread notification badge.
- Bubble supports inline request detail/actions and inline mini chat without redirect.
- Preserved deep links `/requests`, `/conversations`, `/conversations/[id]`.

### Verification/QA

- Added API smoke script `scripts/smoke-api.mjs` and command `npm run smoke:api`.
- Added Playwright config and e2e tests in `e2e/phase1.spec.ts`.
- E2E covers seeded user login/navigation/bubble-to-requests/profile/logout and new user register/onboarding/dashboard.
- Before latest i18n/GLM edits, full verification passed: `npm run db:generate`, `npm run typecheck`, `npm run build`, `npm run smoke:api`, `npm run e2e`.
- After starting i18n/GLM landing edits, `npm run typecheck --workspace @fpt-esporthub/web` passed; full verification still needs rerun after all UI polish.

### Current UI/GLM Thread

- User wants UI/UX to be more engaging, esports-styled, and motivating for training/battle/squad play.
- User wants GLM (`9router/vps/glm-5.2`) to edit each screen one-by-one.
- Attempts:
  - `.swarm/agents/ui-refresh-glm/task.md` timed out without edits.
  - `.swarm/agents/glm-screen-01-landing-auth/task.md` timed out during exploration.
  - `.swarm/agents/glm-screen-01-landing-only/task.md` edited `apps/web/app/page.tsx` but timed out before CSS/typecheck.
  - Manual CSS completion added for new landing classes and web typecheck passed.
  - `.swarm/agents/glm-screen-02-auth-only/task.md` and `.swarm/agents/glm-screen-02a-login-only/task.md` timed out without observed edits.
  - User chose `Cứ retry GLM`; continue retrying GLM with one-screen/one-file prompts.

## Avoid

- Do not expand Phase 1 into full all-in-one esports platform.
- Do not treat voice chat, livestream, wallet, AI anti-toxic, or full tournament automation as MVP.
- Do not block MVP on Riot API approval; always maintain fallback verification.
- Do not edit the original checkpoint report unless explicitly requested.
- Do not route agents to other models unless the user approves.
- Exception: frontend/UI implementation agents are approved to use `9router/vps/glm-5.2`.
- Ask the user immediately if implementation requires clarification about scope, product behavior, or data choices.

## Last Session

- Done: Planning/specs, monorepo, backend modules, frontend core flow, Docker DB/migration/seed, auth/onboarding, API boundary, floating comms bubble, API smoke, browser e2e, handoff docs, review notes file, local servers.
- In progress: Vietnamese interface switch and GLM per-screen UI polish.
- Pending: Continue GLM retry screen-by-screen, rerun full verification after UI/i18n completion, user review, deployment decision, Phase 2 planning.
- Blocker: None.
