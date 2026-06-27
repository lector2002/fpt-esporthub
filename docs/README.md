# FPT EsportHub Docs Index

## Source of Truth

Read in this order:

1. `AI-CONTEXT.md` - current project state and locked decisions.
2. `docs/decisions/DECISIONS.md` - approved product decisions.
3. `docs/phase-1/MVP-Build-Spec.md` - Phase 1 build-ready MVP spec.
4. `docs/phase-1/Phase-1-Handoff.md` - local demo, verification, and handoff runbook.
5. `docs/phase-1/Engineering-Tickets.md` - execution backlog for Phase 1.
6. `docs/phase-1/Sprint-Plan.md` - sprint sequencing and cutline.
7. `docs/architecture/Tech-Stack.md` - approved tech stack.
8. `docs/architecture/System-Architecture.md` - system/module architecture.
9. `docs/FPT-EsportHub-Phase-Based-Agent-Handoffs.md` - phase-based AI subagent routing.
10. `.swarm/synthesis.md` - synthesis from 12 `mimo-v2.5-pro` subagents.

## Phase Docs

| Phase | Folder | Status | Purpose |
| --- | --- | --- | --- |
| Phase 0 | `docs/phase-0/` | planned/spec done | Discovery, validation, prototype, PRD refinement |
| Phase 1 | `docs/phase-1/` | handoff ready | Smart Team Finding MVP |
| Phase 2 | `docs/phase-2/` | planned next | Scrims, clubs, notifications, retention |
| Phase 3 | `docs/phase-3/` | outline | Tournament operations |
| Phase 4 | `docs/phase-4/` | outline | Monetization and ecosystem expansion |

## Current Locked Phase 1 Scope

Phase 1 is a Smart Team Finding MVP for solo student gamers playing Valorant and League of Legends.

P0 core loop:

```text
Register -> Onboarding/Profile -> Find Match -> Send Request -> Accept -> Basic Async Chat
```

Approved decisions:

- Email digest moves to Phase 2.
- Reputation is public in Phase 1, but should be simple and badge/tier-based, not a complex public numeric score.
- Chat Phase 1 is basic async text messaging after accepted request.
- Riot API verification is approved as best-effort with manual fallback.
- Create a single Phase 1 MVP Build Spec as the main implementation handoff.

## Existing Reference Docs

- `docs/Group 1 - FPT Esport Hub - Checkpoint 3 - Report.md` - original EXE101 report and broad vision.
- `docs/FPT-EsportHub-Product-Structure-and-Phase-Plan.md` - prior product planning doc.
- `docs/FPT-EsportHub-Subagent-Handoff-Tasks.md` - initial detailed handoff catalog.
- `docs/FPT-EsportHub-Phase-Based-Agent-Handoffs.md` - current phase-based handoff routing.
- `docs/phase-1/Engineering-Tickets.md` - engineering tickets by module.
- `docs/phase-1/Phase-1-Handoff.md` - runbook and handoff acceptance criteria.
- `docs/phase-1/Sprint-Plan.md` - recommended build order and sprint plan.
- `docs/architecture/Tech-Stack.md` - approved Next.js + NestJS + PostgreSQL + Prisma stack.
- `docs/architecture/System-Architecture.md` - module map, data flow, permission rules.

## Swarm Outputs

Generated outputs live in `.swarm/agents/agent-*/output.md`.

Use these as source artifacts, not final polished docs. Merge stable decisions into phase docs.
