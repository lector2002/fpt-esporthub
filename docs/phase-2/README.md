# Phase 2 - Retention Expansion

## Goal

After Phase 1 validates Team Finding, Phase 2 adds retention loops: scrims, club tools, notification system, and deeper reputation.

## Key Decision

Email digest belongs to Phase 2, not Phase 1.

## Planned Modules

| Module | Purpose | Depends On |
| --- | --- | --- |
| Scrim Rooms | Let teams find practice opponents | Team, MatchRequest |
| Club Tools | Let university clubs manage members/teams | User, Team, Admin |
| Notifications | Retain users through reminders and updates | User preferences, MatchRequest, Events |
| Email Digest | Send Daily Matches and activity summaries | Matching, notification preferences |
| Reputation v2 | Improve trust using review/history data | Report/block, ReputationRecord |
| Public Profiles | Shareable player/team links | PlayerProfile, Team |

## Phase 2 Agent Handoffs

| Agent | Task | Output |
| --- | --- | --- |
| agent-13 | Scrim Room Spec | Scrim flow, data model extension, edge cases |
| agent-14 | Club Tools Spec | Club dashboard, member list, referral code, permissions |
| agent-15 | Notification and Retention Spec | In-app/email trigger matrix and retention KPIs |

## Draft Scope

P0 for Phase 2:

- Scrim room create/browse/request.
- Club profile and member list.
- In-app notifications.
- Email digest for Daily Matches.
- Public player/team profile links.

P1 for Phase 2:

- Post-match/post-scrim review.
- Reputation v2.
- Club referral codes.
- Weekly activity summary.

Out of Phase 2:

- Full bracket system.
- Payment.
- Coaching marketplace.
- Livestream/donation.
