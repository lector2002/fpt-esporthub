# System Architecture

## 1. Architecture Summary

FPT EsportHub uses a split frontend/backend architecture.

```text
Browser
  -> Next.js Web App
    -> NestJS API
      -> PostgreSQL via Prisma
```

Phase 1 uses REST APIs and basic async messages.

Phase 2 can add WebSocket for realtime chat without changing the core domain model.

## 2. High-level Components

| Component | Responsibility |
| --- | --- |
| Next.js Web | UI, routing, forms, dashboard, profile, matching, teams, chat, admin UI |
| NestJS API | Business logic, permissions, matching, requests, chat rules, moderation |
| PostgreSQL | Persistent relational data |
| Prisma | Schema, migrations, type-safe database access |
| WebSocket Gateway | Realtime chat/presence in Phase 2+ |
| Redis | Optional Phase 2+ cache/queue/presence/rate limit support |

## 3. Backend Module Map

Recommended NestJS modules:

```text
api/src/modules/
  auth/
  users/
  profiles/
  lookups/
  teams/
  matching/
  match-requests/
  conversations/
  messages/
  reputation/
  verification/
  tournaments/
  reports/
  blocks/
  admin/
```

## 4. Module Responsibilities

| Module | Responsibility |
| --- | --- |
| `auth` | Register, login, token/session, password hashing, auth guards |
| `users` | Core account data, roles, status |
| `profiles` | Player profile, onboarding, public profile data |
| `lookups` | Games, ranks, roles, goals, communication styles |
| `teams` | Team CRUD, membership, captain permissions |
| `matching` | Rule-based recommendation engine |
| `match-requests` | Request state machine: pending, accepted, declined, cancelled |
| `conversations` | Conversation creation and participant access |
| `messages` | Async text messages, later realtime delivery |
| `reputation` | Public badge/tier, admin numeric score, reputation records |
| `verification` | Riot ID fallback, API verification when available |
| `tournaments` | Phase 1 event listing and event interest |
| `reports` | Report lifecycle and moderation queue integration |
| `blocks` | Block/unblock and exclusion rules |
| `admin` | Admin-only views/actions |

## 5. Frontend Route Map

Recommended Next.js routes:

```text
/
/login
/register
/onboarding
/dashboard
/profile/me
/profile/[id]
/find-match
/requests
/conversations
/conversations/[id]
/teams
/teams/new
/teams/[id]
/events
/events/[id]
/admin
/admin/users
/admin/teams
/admin/reports
/admin/events
```

## 6. Core Data Flow

### 6.1 Onboarding

```text
User registers
  -> completes onboarding
  -> PlayerProfile created/updated
  -> profile becomes eligible for matching
```

### 6.2 Matching

```text
User clicks Find Match
  -> Next.js calls NestJS matching endpoint
  -> Matching service loads candidates
  -> excludes blocked/incomplete/ineligible candidates
  -> scores candidates
  -> returns sorted recommendations with reasons
```

### 6.3 Request and Chat

```text
User sends request
  -> request status = pending
Receiver accepts
  -> request status = accepted
  -> Conversation created
Users send async text messages through REST
```

Phase 2 realtime:

```text
User sends message
  -> REST or WebSocket event
  -> Message persisted
  -> WebSocket Gateway emits to conversation participants
```

### 6.4 Block and Report

```text
User blocks another user
  -> block record created
  -> blocked user excluded from matching, requests, and profile discovery

User reports another user/team/message
  -> report record created
  -> admin queue item created
  -> admin resolves report
  -> reputation may update
```

## 7. Permission Rules

| Action | Permission |
| --- | --- |
| View own profile | Authenticated user |
| Edit own profile | Profile owner |
| Create team | Authenticated user with completed onboarding |
| Edit team | Team captain |
| Accept team request | Team captain |
| Send match request | Authenticated user with completed onboarding |
| Send message | Conversation participant only |
| View admin dashboard | Admin role only |
| Resolve report | Admin role only |

## 8. Phase 1 Non-functional Requirements

- Closed beta size: 50-200 users.
- Matching can use simple database queries and in-memory scoring for Phase 1.
- Basic polling/refresh is acceptable for chat in Phase 1.
- No Redis required in Phase 1.
- All protected backend actions must enforce permission server-side.
- No user email should appear on public profiles.
- Reports and admin details are private.

## 9. Future Expansion Points

| Future Feature | Required Foundation |
| --- | --- |
| Realtime chat | Conversation and Message model, WebSocket Gateway |
| Group/team chat | ConversationParticipant model supports multiple users |
| Scrim rooms | Team entity and match-request pattern |
| Club tools | User/team roles and admin-style permissions |
| Tournament bracket | TournamentEvent and Team entities |
| Payment | User, subscription, transaction, package models |
| Coaching | User profile, reputation, booking/request pattern |
| Sponsorship | Tournament/event analytics |

## 10. Architecture Decision

Architecture should optimize for:

- Real product after class demo.
- Closed beta readiness.
- Future full chat system.
- Multiple product phases.
- Clear backend ownership of business rules.

Therefore, use split Next.js frontend and NestJS backend instead of Supabase-only or frontend-only architecture.
