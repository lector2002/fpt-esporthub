# Phase 1 - MVP Build Spec

## 1. Overview

Phase 1 builds the Smart Team Finding MVP for FPT EsportHub.

Target users:

- Solo student gamers.
- Initial games: Valorant and League of Legends.

Core value:

- Help users find compatible players and teams using structured profiles and rule-based Smart Matchmaking.

Core loop:

```text
Register -> Onboarding/Profile -> Find Match -> Send Request -> Accept -> Basic Async Chat
```

Supporting loop:

```text
Create Team -> Recruit Member -> Accept Request -> Add to Team
```

## 2. Locked Decisions

| Area | Decision |
| --- | --- |
| Tech stack | Next.js frontend + NestJS backend + PostgreSQL + Prisma |
| Email digest | Phase 2, not Phase 1 |
| Reputation | Public simple badge/tier in Phase 1; numeric details admin-only |
| Chat | Basic async text messages after accepted request |
| Riot verification | Best-effort API verification with manual fallback |
| Tournament | Simple event listing + event-based team finding only |
| Matching | Rule-based, not ML |
| Mobile app | Not Phase 1 |
| Voice/livestream/payment/coaching | Not Phase 1 |

## 3. Scope

### 3.0 Technical Scope

Phase 1 uses a split frontend/backend architecture:

```text
apps/web     -> Next.js frontend
apps/api     -> NestJS backend
packages/db  -> Prisma schema, migrations, seed
```

Phase 1 chat uses REST-based async messages. The data model should be WebSocket-ready for Phase 2.

### 3.1 P0 Must Ship

| Module | Feature | Description |
| --- | --- | --- |
| Landing | Landing page | Explain value, supported games, beta CTA |
| Auth | Register/login | Email/password; Google OAuth if easy |
| Onboarding | Preferences | Game, rank, role, schedule, goals, communication style, Riot ID |
| Profile | Player profile | Public identity used for matching |
| Matching | Find Match | Instant recommendations with score and reasons |
| Request | Match request | Send, accept, decline, cancel |
| Chat | Basic async messages | Text-only chat after accepted request |
| Team | Team profile CRUD | Create/edit team, needed roles, invite/apply |
| Reputation | Public badge | Simple trust badge/tier on profile and match cards |

### 3.2 P1 Should Ship

| Module | Feature | Description |
| --- | --- | --- |
| Verification | Riot verification | API if available, manual fallback if not |
| Daily Matches | In-app recommendations | 3-5 suggestions in dashboard; no email in Phase 1 |
| Tournament | Event listing | Event list/detail and interest state |
| Tournament | Find team for event | Show interested players/teams for an event |
| Safety | Report/block | User safety basics |
| Admin | Minimal admin dashboard | Users, teams, reports, events |

### 3.3 Out of Scope

- Email digest.
- Payment/wallet.
- Full bracket system.
- Real-time voice chat.
- Native livestream/donation.
- Coaching marketplace.
- AI anti-toxic moderation.
- Mobile app.
- Advanced analytics.

## 4. User Stories

| ID | Priority | User Story | Module |
| --- | --- | --- | --- |
| US-01 | P0 | As a student gamer, I want to register/login so that I can create my account. | Auth |
| US-02 | P0 | As a new user, I want to enter game, rank, role, schedule, goals, and communication style so that matching can work. | Onboarding |
| US-03 | P0 | As a player, I want a profile showing my game identity and preferences so that others can evaluate compatibility. | Profile |
| US-04 | P0 | As a player, I want to find recommended players or teams by compatibility score so that I can find teammates faster. | Matching |
| US-05 | P0 | As a player, I want to send a match request with a short message so that I can initiate connection. | Request |
| US-06 | P0 | As a receiver, I want to accept or decline requests so that I control who can contact me. | Request |
| US-07 | P0 | As matched users, we want to chat by text after acceptance so that we can coordinate gameplay. | Chat |
| US-08 | P0 | As a captain, I want to create a real team profile so that players can find and join my team. | Team |
| US-09 | P0 | As a player, I want to see public reputation badges so that I can judge trust before sending/accepting requests. | Reputation |
| US-10 | P1 | As a player, I want Riot verification if available so that my rank is more trusted. | Verification |
| US-11 | P1 | As a player, I want Daily Matches in my dashboard so that I can discover matches without searching every time. | Matching |
| US-12 | P1 | As a player, I want to browse events so that I can find tournaments to join. | Tournament |
| US-13 | P1 | As a player, I want to find teammates for a specific event so that I can form a team. | Tournament |
| US-14 | P1 | As a user, I want report/block tools so that I can avoid toxic users. | Safety |
| US-15 | P1 | As an admin, I want basic moderation tools so that I can manage users, reports, teams, and events. | Admin |

## 5. Matching Logic

Matching is rule-based.

Hard filters:

- Same game.
- Active profile.
- Not blocked.
- Team recruitment open for team recommendations.

Weights:

| Factor | Weight |
| --- | --- |
| Rank compatibility | 30% |
| Role compatibility | 20% |
| Schedule overlap | 20% |
| Goal overlap | 15% |
| Communication style | 10% |
| Reputation + verification | 5% |

Recommendation card must show:

- Player/team name.
- Game/rank/role.
- Match score.
- Top 2-3 reasons.
- Public reputation badge.
- Verification badge if available.
- CTA: `Send Request`.

## 6. Reputation v1

Phase 1 uses public simple badge/tier, not detailed numeric score.

Public badges:

| Badge | Meaning | Source |
| --- | --- | --- |
| New | New user, limited history | Default state |
| Verified | Riot/account verification completed | Verification state |
| Trusted | Positive activity, low/no reports | Reputation calculation |
| Caution | Admin warning or unresolved report pattern | Admin/reputation calculation |

Rules:

- Numeric score and breakdown are admin-only.
- Public UI shows only badge/tier.
- Reports should not instantly make a user public `Caution` until admin review or strong threshold is met.
- Blocked/restricted users should be reduced or removed from recommendations.

## 7. Chat v1

Phase 1 chat is basic async text messaging.

Rules:

- Chat opens only after request is accepted.
- 1:1 conversation only.
- Text only.
- No file upload.
- No voice.
- No group chat.
- Polling/simple refresh is acceptable for MVP; real-time WebSocket can be later.

Fallback if chat is too heavy:

- Accepted request reveals contact field, but this is fallback only. Primary Phase 1 decision remains async in-app messages.

## 8. Riot Verification

Verification states:

- `unverified`
- `self_reported`
- `pending`
- `verified`
- `api_failed`
- `suspended`

Phase 1 implementation:

- Ask for Riot ID during onboarding.
- If API access works, verify account/rank.
- If API access is delayed, store Riot ID and self-reported rank.
- Display clear labels: `Verified` vs `Self-reported`.
- Do not block user onboarding or matching if verification fails.

## 9. Data Model Summary

Core entities:

- `User`
- `PlayerProfile`
- `Team`
- `TeamMember`
- `MatchRequest`
- `Conversation`
- `ConversationParticipant`
- `Message`
- `TournamentEvent`
- `EventInterest`
- `Report`
- `Block`
- `ReputationRecord`
- `AdminUser`

Key design decisions:

- `User` and `PlayerProfile` are separate.
- Team is a real entity in Phase 1.
- `MatchRequest` supports player-to-player, player-to-team, and team-to-player.
- Conversation is created only after request acceptance.
- Conversation model should support future group/team chat through participants, even if Phase 1 only uses 1:1 conversations.
- Reputation is computed from records but displayed publicly as simple badge/tier.

## 10. API Summary

Base URL:

```text
/api/v1
```

Required endpoint groups:

| Group | Endpoints |
| --- | --- |
| Auth | `/auth/register`, `/auth/login`, `/auth/me`, `/auth/onboarding` |
| Lookups | `/games`, `/ranks`, `/roles`, `/goals`, `/comm-styles` |
| Players | `/players/me`, `/players/:id`, `/players` |
| Teams | `/teams`, `/teams/:id`, `/teams/:id/members` |
| Matching | `/match/find`, `/match/daily` |
| Requests | `/match/requests`, accept/decline/cancel actions |
| Chat | `/conversations`, `/conversations/:id/messages` |
| Events | `/tournaments`, `/tournaments/:id`, `/tournaments/:id/interest` |
| Safety | `/reports`, `/blocks` |
| Admin | `/admin/users`, `/admin/teams`, `/admin/reports`, `/admin/tournaments`, `/admin/metrics` |

Key constraints:

- Matching requires completed onboarding.
- Chat requires accepted request.
- Team update requires captain permission.
- Admin endpoints require admin role.
- Blocked users cannot send requests or appear in recommendations.
- Backend enforces all permission rules; frontend checks are not sufficient.

## 11. Screens

MVP screens:

- Landing page.
- Register.
- Login.
- Onboarding wizard.
- Dashboard.
- Player profile.
- Edit profile.
- Find Match.
- Match results.
- Match request modal.
- Requests list.
- Conversation view.
- Team list.
- Team detail.
- Create/edit team.
- Tournament/event list.
- Tournament/event detail.
- Report/block modal.
- Admin dashboard.

Navigation:

- Home.
- Find Match.
- Requests.
- Teams.
- Events.
- Profile.

## 12. QA and Beta Readiness

Must test:

- Registration/login.
- Onboarding required fields.
- Profile creation and update.
- Find Match returns ranked recommendations.
- Request send/accept/decline/cancel.
- Chat only after accepted request.
- Team create/edit/invite/apply.
- Public reputation badge display.
- Riot fallback labels.
- Event listing and event interest.
- Report/block behavior.
- Admin can view/manage users, teams, reports, events.

Beta readiness blockers:

- Auth works.
- Onboarding works.
- At least 20 seeded profiles exist.
- At least 5 seeded teams exist.
- Matching returns non-empty results for seeded users.
- Request and chat flow works end-to-end.
- Report/block works.
- Admin can resolve reports.

## 13. Build Order

1. Auth.
2. Lookup data for games/ranks/roles/goals/communication styles.
3. Onboarding and player profile.
4. Team CRUD.
5. Matching algorithm and Find Match UI.
6. Match request flow.
7. Basic async chat.
8. Public reputation badge.
9. Riot verification fallback/API integration.
10. Tournament event listing and interest.
11. Report/block.
12. Minimal admin dashboard.
13. In-app Daily Matches.

## 14. Open Questions Before Coding

- Exact tech stack: frontend, backend, database, auth provider.
- Whether Google OAuth is required in MVP or optional.
- Whether reputation badge labels should be English or Vietnamese.
- Whether public profile is accessible by URL or only inside authenticated app.
- Whether beta users are limited to FPT University first.
