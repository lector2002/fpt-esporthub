# Phase 3 - Tournament Operations

## Goal

Turn FPT EsportHub from a team-finding/scrim platform into a usable tournament operations tool for university clubs and organizers.

## Planned Modules

| Module | Purpose | Depends On |
| --- | --- | --- |
| Organizer Dashboard | Create and manage tournaments | Event listing, Admin foundation |
| Bracket System | Structure matches | Team, TournamentEvent |
| Check-in Flow | Confirm team attendance | Team, Notification |
| Result Submission | Let captains submit results | Match, TeamMember |
| Dispute Handling | Resolve conflicts | Report/Admin queue |

## Phase 3 Agent Handoffs

| Agent | Task | Output |
| --- | --- | --- |
| agent-16 | Tournament Organizer Agent | Organizer dashboard and event lifecycle |
| agent-17 | Bracket and Match Ops Agent | Bracket, check-in, result, dispute specs |

## Draft Scope

P0 for Phase 3:

- Organizer dashboard.
- Tournament create/edit.
- Team registration approval.
- Bracket generation.
- Check-in.
- Result submission.
- Dispute handling.

P1 for Phase 3:

- School leaderboard.
- Regional ranking.
- Tournament analytics.

Out of Phase 3:

- Payment/wallet unless needed for a specific pilot.
- Native livestream infrastructure.
