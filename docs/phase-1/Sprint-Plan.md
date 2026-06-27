# Phase 1 - Sprint Plan

## 1. Goal

Deliver the Phase 1 Smart Team Finding MVP in controlled build slices.

Primary MVP success path:

```text
User registers -> completes onboarding -> sees match recommendations -> sends request -> receiver accepts -> chat opens
```

## 2. Assumptions

- Team uses Next.js frontend + NestJS backend + PostgreSQL + Prisma.
- Phase 1 excludes email digest, payment, full tournament bracket, voice chat, livestream, coaching marketplace, and mobile app.
- Chat is async text messaging.
- Reputation is public as simple badge/tier.
- Riot verification has manual fallback.
- Backend is WebSocket-ready for Phase 2 full chat system, but WebSocket is not required in Phase 1.

## 3. Sprint Breakdown

### Sprint 0 - Project Setup

Goal: make the codebase runnable.

Tickets:

- ENG-001 - Choose and Initialize Tech Stack
- ENG-004 - Implement Lookup Data

Deliverables:

- Running Next.js app shell.
- Running NestJS API shell.
- PostgreSQL + Prisma schema/migrations setup.
- Seed lookup data.
- Environment setup docs.

Exit criteria:

- Frontend and backend run locally.
- Lookup values load.
- README setup works.

### Sprint 1 - Account, Onboarding, Profile

Goal: create users and collect matching data.

Tickets:

- ENG-002 - Implement User Registration and Login
- ENG-005 - Build Onboarding Wizard
- ENG-006 - Build Player Profile View and Edit
- ENG-020 - Build Landing Page

Deliverables:

- Landing page.
- Register/login.
- Onboarding wizard.
- Profile view/edit.

Exit criteria:

- User can register, complete onboarding, and view/edit profile.
- User cannot access matching before onboarding.

### Sprint 2 - Teams and Matching

Goal: make recommendations work.

Tickets:

- ENG-007 - Implement Team CRUD
- ENG-009 - Implement Rule-based Matching Engine
- ENG-010 - Build Find Match UI
- ENG-021 - Create Seed Data for Beta

Deliverables:

- Team profile CRUD.
- Matching algorithm.
- Find Match UI.
- Seeded players/teams.

Exit criteria:

- Seeded users get non-empty player/team recommendations.
- Match cards show score, reasons, reputation badge, and verification state.

### Sprint 3 - Requests, Chat, Reputation

Goal: turn recommendations into actual connection.

Tickets:

- ENG-012 - Implement Match Requests
- ENG-013 - Implement Conversation and Text Messages
- ENG-014 - Implement Reputation Badge v1
- ENG-008 - Implement Team Membership and Applications

Deliverables:

- Request flow.
- Accept/decline/cancel states.
- Async 1:1 chat after acceptance.
- Reputation badge visible.
- Team application/acceptance flow.

Exit criteria:

- Core loop works end-to-end.
- Chat cannot be used before request acceptance.
- Accepted team request can update roster.

### Sprint 4 - Verification, Events, Safety, Admin

Goal: make beta safe and event-ready.

Tickets:

- ENG-015 - Implement Riot ID Fallback Verification State
- ENG-017 - Implement Event Listing and Event Interest
- ENG-018 - Implement Report and Block
- ENG-019 - Implement Minimal Admin Dashboard
- ENG-011 - Implement In-app Daily Matches

Deliverables:

- Riot ID fallback state.
- Event listing and interest.
- Report/block.
- Admin dashboard.
- In-app Daily Matches.

Exit criteria:

- Admin can manage users, teams, reports, events.
- Blocked users are excluded from requests/matching.
- Events can support basic team-finding interest.

### Sprint 5 - Beta Hardening

Goal: prepare closed beta.

Tickets:

- ENG-022 - Beta Readiness Checklist Execution
- Bug fixes from QA.
- UX polish from test users.

Deliverables:

- QA checklist completed.
- Known limitations documented.
- Beta test data ready.
- Launch decision.

Exit criteria:

- No blocker bugs in core loop.
- 5 full end-to-end test runs pass.
- Product owner approves closed beta.

## 4. Critical Path

```text
ENG-001 -> ENG-002 -> ENG-005 -> ENG-006 -> ENG-009 -> ENG-010 -> ENG-012 -> ENG-013 -> ENG-022
```

Critical path explanation:

- Without auth, no user state.
- Without onboarding/profile, no matching inputs.
- Without matching, no request value.
- Without request acceptance, no chat.
- Without QA, no beta.

## 5. Parallelizable Work

Can run in parallel after Sprint 1:

- Team CRUD and matching engine.
- Landing page and profile UI polish.
- Riot fallback state and event listing.
- Admin dashboard and report/block after base user/team data exists.

## 6. Beta Readiness Metrics

Minimum before closed beta:

- 20-30 seeded player profiles.
- 5 seeded teams.
- 1-2 seeded events.
- 5 successful full core-loop test runs.
- 0 blocker bugs.
- Admin can resolve reports.

Target closed beta KPIs:

- 100-200 registered users.
- 50 completed profiles.
- 20 teams created.
- 100 match requests sent.
- 30 accepted match requests.
- 20% D7 return after activation.

## 7. Cutline If Timeline Slips

Keep:

- Auth.
- Onboarding/profile.
- Team CRUD.
- Matching.
- Requests.
- Basic async chat.
- Reputation badge.
- Seed data.

Cut or delay:

- Google OAuth.
- Riot API automation.
- Event interest.
- Daily Matches.
- Advanced admin metrics.
- Premium waitlist.

Do not cut:

- Request state rules.
- Chat-after-acceptance rule.
- Blocked-user exclusion.
- Basic admin/report handling for beta safety.
