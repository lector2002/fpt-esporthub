# Phase 1 - Engineering Tickets

## 1. Purpose

This document converts `docs/phase-1/MVP-Build-Spec.md` into implementation tickets for the Phase 1 Smart Team Finding MVP.

Use this as the main execution backlog for developers or coding agents.

## 2. Priority Legend

| Priority | Meaning |
| --- | --- |
| P0 | Required for MVP core loop |
| P1 | Should ship if capacity allows |
| P2 | Can defer without breaking MVP |

## 2.1 AI Model Routing

| Ticket Type | Model |
| --- | --- |
| Frontend/UI implementation | `9router/vps/glm-5.2` |
| Backend/API/database implementation | existing coding model unless changed |
| Product/spec/research docs | `9router/mimo-v2.5-pro` unless changed |

Frontend-heavy tickets should be assigned to `9router/vps/glm-5.2`, including landing, onboarding UI, profile UI, Find Match UI, team UI, requests/chat UI, event UI, and admin UI.

## 3. Module Dependency Map

```text
Foundation
  -> Auth
    -> Onboarding/Profile
      -> Team
      -> Matching
        -> Match Request
          -> Basic Async Chat
      -> Public Reputation Badge
      -> Riot Verification Fallback
      -> Event Listing
        -> Find Team for Event
      -> Report/Block
        -> Admin Dashboard
```

## 4. Tickets

### EPIC-01 - Project Foundation

#### ENG-001 - Choose and Initialize Tech Stack

Priority: P0

Owner type: Tech Lead / Full-stack

Depends on: none

Goal: Create the app foundation for web-first MVP.

Scope:

- Choose frontend framework.
- Choose backend/API framework.
- Choose database.
- Choose auth approach.
- Create environment structure.
- Add basic lint/format config.
- Add README run instructions.

Acceptance criteria:

- App can run locally.
- Backend/API can run locally.
- Database connection strategy is documented.
- `.env.example` exists with required variables.
- README includes setup/run commands.

Definition of Done:

- Local setup works from clean clone.
- No secrets committed.
- Basic health endpoint or landing route works.

Notes:

- Approved stack: Next.js frontend + NestJS backend + PostgreSQL + Prisma.
- Recommended repo structure: `apps/web`, `apps/api`, `packages/database`, `packages/shared`.
- Phase 1 chat is REST-based async messages; backend should remain WebSocket-ready for Phase 2.

---

### EPIC-02 - Auth and User Foundation

#### ENG-002 - Implement User Registration and Login

Priority: P0

Owner type: Backend / Full-stack

Depends on: ENG-001

Goal: Let users create accounts and log in.

Scope:

- Email/password registration through NestJS API.
- Email/password login through NestJS API.
- Session/token handling.
- Logout.
- Current user endpoint/page state.
- Duplicate email validation.
- Password minimum validation.

Acceptance criteria:

- User can register with valid email/password.
- Duplicate email shows error.
- User can log in after registering.
- User can log out.
- Protected pages redirect unauthenticated users.

Definition of Done:

- Auth state persists across refresh.
- Auth errors are user-readable.
- Basic tests or manual QA checklist completed.
- Backend guards protect API routes server-side.

#### ENG-003 - Optional Google OAuth

Priority: P2

Owner type: Full-stack

Depends on: ENG-002

Goal: Let users log in with Google if easy.

Scope:

- Google OAuth provider.
- Account linking by email.

Acceptance criteria:

- User can sign up/login with Google.
- Existing email account handles conflict safely.

Definition of Done:

- OAuth callback works in local/dev environment.
- If setup becomes slow, defer without blocking MVP.

---

### EPIC-03 - Lookup Data

#### ENG-004 - Implement Game, Rank, Role, Goal, Communication Style Lookups

Priority: P0

Owner type: Backend / Full-stack

Depends on: ENG-001

Goal: Provide canonical values used by onboarding, profiles, matching, and team setup.

Scope:

- Seed games: Valorant, League of Legends.
- Seed Valorant roles: Duelist, Initiator, Controller, Sentinel.
- Seed League roles: Top, Jungle, Mid, ADC, Support.
- Seed goals: Rank climb, Casual play, Scrim practice, Join tournaments, Find team, Find members.
- Seed communication styles: Chill, Try-hard, Quiet focus, Shotcaller, Beginner friendly.
- Seed rank data for both games.

Acceptance criteria:

- Lookup values are available to onboarding and team forms.
- Rank values include sortable numeric mapping.
- Role list changes based on selected game.

Definition of Done:

- Seed script or migration exists.
- Lookup API/page state verified.

---

### EPIC-04 - Onboarding and Player Profile

#### ENG-005 - Build Onboarding Wizard

Priority: P0

Owner type: Frontend / Full-stack

AI model route: `9router/vps/glm-5.2` for frontend implementation

Depends on: ENG-002, ENG-004

Goal: Collect required data for matching.

Scope:

- Step 1: choose game.
- Step 2: choose rank and role.
- Step 3: choose play schedule.
- Step 4: choose up to 2 goals and up to 2 communication styles.
- Step 5: optional Riot ID.
- Save onboarding status.

Acceptance criteria:

- User cannot use Find Match before onboarding is complete.
- Required fields validate before submission.
- Goals and communication styles enforce max 2 selections.
- User can complete onboarding and reach dashboard.

Definition of Done:

- Data persists correctly.
- Empty/validation states implemented.
- Manual QA passes for valid and invalid onboarding.

#### ENG-006 - Build Player Profile View and Edit

Priority: P0

Owner type: Frontend / Full-stack

AI model route: `9router/vps/glm-5.2` for frontend implementation

Depends on: ENG-005

Goal: Let users view and update their player identity.

Scope:

- View own profile.
- Edit display name, avatar, bio, game, rank, role, schedule, goals, communication styles, looking status.
- View another player profile.
- Show verification label.
- Show public reputation badge.

Acceptance criteria:

- User can update profile fields.
- Profile view shows all matching-relevant fields.
- Public profile does not expose private email.
- Public reputation badge is visible.

Definition of Done:

- Profile data drives matching inputs.
- Profile route works for self and other users.

---

### EPIC-05 - Team Module

#### ENG-007 - Implement Team CRUD

Priority: P0

Owner type: Full-stack

Depends on: ENG-004, ENG-006

Goal: Create real team entities for recruitment and future scrims/tournaments.

Scope:

- Create team.
- Edit team as captain.
- View team detail.
- Browse teams.
- Needed roles.
- Rank range.
- Play schedule.
- Team goals.
- Communication style.
- Recruitment open/closed.

Acceptance criteria:

- User can create a team and becomes captain.
- Captain can edit team details.
- Non-captains cannot edit team.
- Team detail shows needed roles and recruitment status.

Definition of Done:

- Team data can be used by matching.
- Permission checks implemented.

#### ENG-008 - Implement Team Membership and Applications

Priority: P0

Owner type: Full-stack

Depends on: ENG-007, ENG-010

Goal: Let players join teams through request flow.

Scope:

- Player applies to team through match request.
- Captain accepts/declines.
- Accepted player can be added to team roster.
- Captain can remove member.

Acceptance criteria:

- Player-to-team request works.
- Captain controls acceptance.
- Team roster updates after acceptance.
- Duplicate pending applications are prevented.

Definition of Done:

- Team membership state is consistent after accept/remove.

---

### EPIC-06 - Smart Matchmaking

#### ENG-009 - Implement Rule-based Matching Engine

Priority: P0

Owner type: Backend / Full-stack

Depends on: ENG-004, ENG-006, ENG-007

Goal: Generate ranked recommendations for player-to-player and player-to-team matching.

Scope:

- Hard filter same game.
- Exclude blocked users.
- Exclude inactive/incomplete profiles.
- Score by rank, role, schedule, goal, communication style, reputation, verification.
- Support `find_players` mode.
- Support `find_team` mode.
- Return match score and reasons.

Acceptance criteria:

- Matching returns sorted results by score.
- Results include top reasons.
- Same-game hard filter is enforced.
- Blocked users do not appear.
- Teams with recruitment closed do not appear in team results.

Definition of Done:

- Matching output supports Find Match UI.
- At least 5 seeded profiles produce non-empty recommendations.

#### ENG-010 - Build Find Match UI

Priority: P0

Owner type: Frontend / Full-stack

AI model route: `9router/vps/glm-5.2` for frontend implementation

Depends on: ENG-009

Goal: Let users run matching and act on results.

Scope:

- Mode selector: Find Players / Find Team.
- Results list.
- Match card with score, reasons, rank, role, schedule hint, reputation badge, verification label.
- CTA: Send Request.
- Empty state if no matches.

Acceptance criteria:

- User can switch matching mode.
- Match cards show score and reasons.
- User can open request modal from a result.
- Empty state guides user to update profile or check later.

Definition of Done:

- UI handles loading, empty, error, and success states.

#### ENG-011 - Implement In-app Daily Matches

Priority: P1

Owner type: Full-stack

Depends on: ENG-009, ENG-010

Goal: Show 3-5 recommended matches in dashboard without email.

Scope:

- Generate daily recommendations from matching engine.
- Display on dashboard.
- Refresh at most daily.

Acceptance criteria:

- Dashboard shows Daily Matches after onboarding.
- No email is sent in Phase 1.
- Empty state works for low user pool.

Definition of Done:

- Daily Matches reuse matching engine, not separate logic.

---

### EPIC-07 - Match Request Flow

#### ENG-012 - Implement Match Requests

Priority: P0

Owner type: Full-stack

Depends on: ENG-010

Goal: Let users initiate and manage match connections.

Scope:

- Send request to player.
- Send request to team.
- Optional team-to-player invite.
- Pending/accepted/declined/cancelled states.
- Request message.
- Requests list.

Acceptance criteria:

- User can send request with message.
- Receiver can accept/decline.
- Sender can cancel pending request.
- Duplicate pending request to same receiver is blocked.
- Accepted request creates conversation.

Definition of Done:

- Request state transitions are enforced server-side.

---

### EPIC-08 - Basic Async Chat

#### ENG-013 - Implement Conversation and Text Messages

Priority: P0

Owner type: Full-stack

Depends on: ENG-012

Goal: Let accepted matches coordinate through in-app async text messages.

Scope:

- Conversation created after accepted request.
- ConversationParticipant model exists or equivalent participant access logic exists.
- Conversation list.
- Conversation detail.
- Send text message.
- Show timestamps.
- Basic unread count if easy.

Acceptance criteria:

- Chat is unavailable before request acceptance.
- Accepted request opens conversation.
- Users can send and view text messages.
- Users outside the conversation cannot access it.
- No file upload, group chat, or voice chat.

Definition of Done:

- Basic async flow works by refresh or polling.
- Database model can support future group/team chat without rewrite.

---

### EPIC-09 - Public Reputation Badge

#### ENG-014 - Implement Reputation Badge v1

Priority: P0

Owner type: Full-stack

Depends on: ENG-006, ENG-015

Goal: Show simple public trust signal without exposing detailed numeric reputation.

Scope:

- Public badges: New, Verified, Trusted, Caution.
- Admin-only numeric score/breakdown.
- Badge appears on profile and match cards.
- Badge updates from verification and moderation signals.

Acceptance criteria:

- New users show `New` or default badge.
- Verified users can show `Verified`.
- Users with reviewed negative moderation can show `Caution`.
- Public users cannot see numeric score or report details.

Definition of Done:

- Badge state is consistent across profile and match results.

---

### EPIC-10 - Riot Verification

#### ENG-015 - Implement Riot ID Fallback Verification State

Priority: P1

Owner type: Full-stack

Depends on: ENG-005, ENG-006

Goal: Support verification UX without blocking MVP on Riot API.

Scope:

- Store Riot ID.
- Store verification state.
- Show `Self-reported` or `Unverified` label.
- Support admin/manual update to `Verified` if needed.

Acceptance criteria:

- User can enter Riot ID during onboarding/profile edit.
- Verification failure does not block matching.
- UI clearly distinguishes verified from self-reported.

Definition of Done:

- Fallback path works without API key.

#### ENG-016 - Integrate Riot API Verification

Priority: P2

Owner type: Backend

Depends on: ENG-015

Goal: Verify Riot data automatically if API access is available.

Scope:

- Implement Riot API client.
- Verify account identity and/or rank where feasible.
- Handle API errors/rate limits.
- Update verification state.

Acceptance criteria:

- Successful API call marks user verified.
- API failure marks `api_failed` or keeps fallback state.
- API delay does not block MVP.

Definition of Done:

- Integration is feature-flagged or safely optional.

---

### EPIC-11 - Tournament Event Listing

#### ENG-017 - Implement Event Listing and Event Interest

Priority: P1

Owner type: Full-stack

Depends on: ENG-006, ENG-007

Goal: Support tournament-adjacent team finding without full tournament operations.

Scope:

- Event list.
- Event detail.
- Mark/unmark interest.
- Show interested players/teams.
- Event fields: game, date, organizer, rules, deadline.

Acceptance criteria:

- User can browse events.
- User can mark interest in an event.
- Event detail shows interested players/teams.
- No bracket/payment/check-in/result features in Phase 1.

Definition of Done:

- Event data can support `Find team for event` flow.

---

### EPIC-12 - Safety and Admin

#### ENG-018 - Implement Report and Block

Priority: P1

Owner type: Full-stack

Depends on: ENG-006, ENG-012

Goal: Provide basic user safety tools.

Scope:

- Report user/team/message.
- Block/unblock user.
- Blocked users hidden from matching and requests.
- Report reason and description.

Acceptance criteria:

- User can report another user/team/message.
- User can block/unblock user.
- Blocked user cannot send request or appear in recommendations.
- Reports are visible to admin.

Definition of Done:

- Safety behavior is enforced server-side.

#### ENG-019 - Implement Minimal Admin Dashboard

Priority: P1

Owner type: Full-stack

Depends on: ENG-018, ENG-017

Goal: Let admins operate beta safely.

Scope:

- Admin login/role check.
- User list.
- Team list.
- Report queue.
- Event list/create/edit.
- Resolve report: dismiss, warn, restrict/ban.

Acceptance criteria:

- Non-admin users cannot access admin routes.
- Admin can view reports.
- Admin can resolve reports.
- Admin can create/edit event listings.

Definition of Done:

- Admin can manage beta without direct database edits.

---

### EPIC-13 - Landing and Beta Capture

#### ENG-020 - Build Landing Page

Priority: P0

Owner type: Frontend

AI model route: `9router/vps/glm-5.2`

Depends on: ENG-001

Goal: Communicate value proposition and route users to registration.

Scope:

- Hero.
- Problem section.
- Feature section.
- Supported games.
- CTA to register.
- Basic responsive layout.

Acceptance criteria:

- Landing page explains Team Finding clearly.
- CTA routes to registration.
- Works on mobile and desktop.

Definition of Done:

- No Premium waitlist needed unless simple.

---

### EPIC-14 - Seed Data and Beta Ops

#### ENG-021 - Create Seed Data for Beta

Priority: P0

Owner type: Full-stack / QA

Depends on: ENG-004, ENG-006, ENG-007

Goal: Avoid cold-start empty state during testing.

Scope:

- Seed 20-30 player profiles.
- Seed 5 teams.
- Seed 1-2 event listings.
- Seed varied ranks, roles, goals, schedules.

Acceptance criteria:

- New beta user gets non-empty match results.
- QA can test player and team matching.
- QA can test event interest.

Definition of Done:

- Seed data can be reset safely.

#### ENG-022 - Beta Readiness Checklist Execution

Priority: P0

Owner type: QA / Product

Depends on: all P0 tickets

Goal: Confirm MVP is ready for closed beta.

Scope:

- Run manual QA checklist.
- Verify core loop end-to-end.
- Verify mobile responsive behavior.
- Verify seeded data.
- Verify admin can handle reports.

Acceptance criteria:

- No blocker bugs in P0 flow.
- At least 5 complete core-loop test runs pass.
- Known limitations documented.

Definition of Done:

- Beta launch decision can be made.

## 5. P0 Ticket Checklist

- [ ] ENG-001 - Choose and Initialize Tech Stack
- [ ] ENG-002 - Implement User Registration and Login
- [ ] ENG-004 - Implement Lookup Data
- [ ] ENG-005 - Build Onboarding Wizard
- [ ] ENG-006 - Build Player Profile View and Edit
- [ ] ENG-007 - Implement Team CRUD
- [ ] ENG-009 - Implement Rule-based Matching Engine
- [ ] ENG-010 - Build Find Match UI
- [ ] ENG-012 - Implement Match Requests
- [ ] ENG-013 - Implement Conversation and Text Messages
- [ ] ENG-014 - Implement Reputation Badge v1
- [ ] ENG-020 - Build Landing Page
- [ ] ENG-021 - Create Seed Data for Beta
- [ ] ENG-022 - Beta Readiness Checklist Execution

## 6. Recommended P1 Checklist

- [ ] ENG-008 - Implement Team Membership and Applications
- [ ] ENG-011 - Implement In-app Daily Matches
- [ ] ENG-015 - Implement Riot ID Fallback Verification State
- [ ] ENG-017 - Implement Event Listing and Event Interest
- [ ] ENG-018 - Implement Report and Block
- [ ] ENG-019 - Implement Minimal Admin Dashboard

## 7. Deferred Checklist

- [ ] ENG-003 - Optional Google OAuth
- [ ] ENG-016 - Integrate Riot API Verification
