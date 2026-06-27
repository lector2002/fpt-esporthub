# FPT EsportHub - Phase-Based Agent Handoffs

## 1. Objective

Create clear phase-by-phase handoffs so AI subagents can work independently on FPT EsportHub and produce artifacts that are easy to merge into product docs, engineering specs, report content, and implementation backlog.

All worker agents are routed to:

- Default model: `9router/mimo-v2.5-pro`
- Frontend/UI implementation model: `9router/vps/glm-5.2`
- Runner: `opencode run`
- Workspace: project root
- Shared workspace: `.swarm/`

Routing rule:

- Use `9router/vps/glm-5.2` for tasks that implement or substantially design frontend UI code in `apps/web`.
- Use `9router/mimo-v2.5-pro` for product planning, specs, research, backend-neutral docs, and non-frontend handoffs unless changed.

## 2. Fixed Product Context

| Area | Locked Context |
| --- | --- |
| Product | FPT EsportHub |
| Long-term vision | Student esports operating system: team finding, scrims, club tools, tournament operations, premium, coaching, sponsorship, livestream |
| MVP wedge | Smart Team Finding |
| Primary MVP user | Solo student gamers |
| First games | Valorant, League of Legends |
| MVP matching | Hybrid: instant recommendation list + Daily Matches |
| MVP team model | Real team profile |
| MVP communication | Match request + basic messages after acceptance |
| MVP tournament | Simple event listing + find team for tournament |
| MVP monetization | Free MVP + Premium waitlist |
| MVP safety | Report, block, basic reputation score |
| MVP verification | Riot API if possible, fallback to manual/unverified profile |

## 3. Phase Overview

| Phase | Name | Goal | Main Outputs |
| --- | --- | --- | --- |
| Phase 0 | Discovery and Prototype | Validate problem, refine PRD, define flows, compare competitors | PRD v2, competitor map, UX flows, prototype requirements |
| Phase 1 | MVP Build Spec | Create build-ready specs for Team Finding MVP | Matching logic, data model, API spec, admin/moderation, QA plan |
| Phase 2 | Retention Expansion | Expand into scrims, club tools, reputation, notifications, public profiles | Scrim spec, club dashboard spec, notification/reputation expansion |
| Phase 3 | Tournament Operations | Add organizer workflows and tournament operations | Bracket/check-in/result/dispute specs |
| Phase 4 | Monetization and Ecosystem | Add premium, packages, sponsorship, coaching, livestream path | Monetization spec, business packages, partner playbooks |

## 4. Agent Output Contract

Every agent must write:

- Final output: `.swarm/agents/<agent-id>/output.md`
- Intermediate findings: `.swarm/messages/<agent-id>/findings.md`

Every output must include:

- `Summary`
- `Detailed Work`
- `Decisions Proposed`
- `Assumptions`
- `Open Questions`
- `Recommended Next Actions`
- `Files/Sections to Update`

## 5. Phase 0 Handoffs - Discovery and Prototype

### P0-A01 - PRD Refinement Agent

**Route:** `agent-01`, `9router/mimo-v2.5-pro`

**Goal:** Produce MVP PRD v2 from current product plan.

**Inputs:**

- `AI-CONTEXT.md`
- `docs/FPT-EsportHub-Product-Structure-and-Phase-Plan.md`

**Tasks:**

- Rewrite MVP scope into clear user stories.
- Define P0/P1/P2 features for Phase 1.
- Define acceptance criteria for P0 features.
- Identify ambiguous or oversized MVP features.
- Keep long-term ecosystem as roadmap only.

**Deliverables:**

- MVP PRD v2.
- User story table.
- Feature priority table.
- Acceptance criteria table.
- Scope cutline.

**Acceptance Criteria:**

- Every P0 feature maps to a user story.
- Every P0 feature has testable acceptance criteria.
- No payment, wallet, voice chat, livestream, coaching marketplace, or full bracket system in Phase 1.

### P0-A02 - Competitor Research Agent

**Route:** `agent-02`, `9router/mimo-v2.5-pro`

**Goal:** Compare alternatives and define MVP differentiation.

**Inputs:**

- `AI-CONTEXT.md`
- Product plan.

**Tasks:**

- Compare Facebook Groups, Discord, FACEIT, Challengermode/Battlefy/Toornament, and local community behavior.
- Compare by teammate finding, filters, team profile, tournament support, trust, student/community fit.
- Identify gaps FPT EsportHub can exploit.
- Propose landing page claims and claims to avoid.

**Deliverables:**

- Competitor comparison table.
- Differentiation statement.
- Positioning recommendations.
- Risk table.

**Acceptance Criteria:**

- At least 5 alternatives compared.
- Output supports the Team Finding wedge.
- Claims remain realistic for MVP.

### P0-A03 - UX Flow Discovery Agent

**Route:** `agent-03`, `9router/mimo-v2.5-pro`

**Goal:** Define end-to-end MVP user flows before wireframes.

**Inputs:**

- `AI-CONTEXT.md`
- Product plan.

**Tasks:**

- Define onboarding flow.
- Define solo-to-solo matching flow.
- Define solo-to-team matching flow.
- Define team creation/recruitment flow.
- Define tournament team-finding flow.
- Define report/block flow.
- Identify screens, empty states, and failure states.

**Deliverables:**

- Text flow diagrams.
- Screen inventory.
- Empty/error state list.
- UX risk list.

**Acceptance Criteria:**

- Each flow has start state, steps, success state, and failure state.
- Screen inventory clearly separates MVP and post-MVP.

### P0-A04 - Phase Architecture Agent

**Route:** `agent-04`, `9router/mimo-v2.5-pro`

**Goal:** Translate the large long-term project into clear phase architecture.

**Inputs:**

- `AI-CONTEXT.md`
- Product plan.
- Original report.

**Tasks:**

- Map all features into Phase 0-4.
- Define what should not be built early.
- Define dependencies between phases.
- Produce a large-project module map.
- Identify reusable foundations needed in Phase 1 for later phases.

**Deliverables:**

- Phase architecture map.
- Feature-by-phase table.
- Dependency map.
- Future-proofing recommendations.

**Acceptance Criteria:**

- Phase 1 remains focused on Team Finding.
- Later phases are clear enough for future handoffs.

## 6. Phase 1 Handoffs - MVP Build Spec

### P1-A05 - Matching Logic Agent

**Route:** `agent-05`, `9router/mimo-v2.5-pro`

**Depends on:** `agent-01`, `agent-03`

**Goal:** Design rule-based Smart Matchmaking for Phase 1.

**Tasks:**

- Define solo-to-solo score.
- Define solo-to-team score.
- Define rank, role, schedule, goal, communication style, reputation weighting.
- Define recommendation reason copy.
- Provide pseudocode and examples.

**Deliverables:** Matching formula, weights, pseudocode, edge cases, examples.

**Acceptance Criteria:** Must be implementable without ML or training data.

### P1-A06 - Data Model Agent

**Route:** `agent-06`, `9router/mimo-v2.5-pro`

**Depends on:** `agent-01`, `agent-05`

**Goal:** Define MVP data model and relationships.

**Tasks:**

- Define entities: User, PlayerProfile, Team, TeamMember, MatchRequest, Message, TournamentEvent, Report, ReputationRecord, AdminUser.
- Define fields, enums, relationships.
- Support matching, request/chat, moderation, and event listing.

**Deliverables:** Entity tables, relationship map, enum list, MVP vs Phase 2+ split.

**Acceptance Criteria:** Schema supports all P0 flows.

### P1-A07 - Admin and Moderation Agent

**Route:** `agent-07`, `9router/mimo-v2.5-pro`

**Depends on:** `agent-01`, `agent-06`

**Goal:** Specify safety, moderation, report/block, and reputation v1.

**Tasks:**

- Define report lifecycle.
- Define block behavior.
- Define admin queue.
- Define reputation v1.
- Define abuse/spam prevention.

**Deliverables:** Moderation spec, admin dashboard sections, reputation logic, abuse cases.

**Acceptance Criteria:** No dependency on AI anti-toxic.

### P1-A08 - Riot Verification Agent

**Route:** `agent-08`, `9router/mimo-v2.5-pro`

**Depends on:** `agent-01`, `agent-05`

**Goal:** Research and specify Riot verification options and fallback.

**Tasks:**

- Assess LoL/Valorant Riot API feasibility.
- Define verification states.
- Define fallback manual/unverified flow.
- Recommend product copy.

**Deliverables:** Feasibility summary, risk table, fallback flow, verification labels.

**Acceptance Criteria:** MVP is not blocked by Riot API.

### P1-A09 - API and Functional Spec Agent

**Route:** `agent-09`, `9router/mimo-v2.5-pro`

**Depends on:** `agent-05`, `agent-06`, `agent-07`

**Goal:** Define functional API specs for MVP.

**Tasks:**

- Define resources and endpoints.
- Define permissions and validation.
- Define request/response examples.
- Define matching endpoint output.
- Enforce chat only after accepted request.

**Deliverables:** Endpoint table, permission matrix, validation/error rules.

**Acceptance Criteria:** Covers all P0 flows.

### P1-A10 - Wireframe Spec Agent

**Route:** `agent-10`, `9router/mimo-v2.5-pro` for spec; use `9router/vps/glm-5.2` for future frontend implementation agents

**Depends on:** `agent-03`, `agent-05`, `agent-06`

**Goal:** Create screen-level specs for UI/UX.

**Tasks:**

- Define screens and components.
- Define CTAs, fields, empty states, validation errors.
- Define navigation.
- Define responsive notes.

**Deliverables:** Screen spec table, navigation map, state list, CTA copy.

**Acceptance Criteria:** Designer can create Figma directly from output.

### P1-A11 - MVP QA and Beta Readiness Agent

**Route:** `agent-11`, `9router/mimo-v2.5-pro`

**Depends on:** `agent-09`, `agent-10`

**Goal:** Define practical QA and beta readiness plan.

**Tasks:**

- Create test scenarios for all P0 flows.
- Create manual QA checklist.
- Create beta readiness checklist.
- Create beta feedback survey.

**Deliverables:** QA scenarios, launch checklist, feedback form questions.

**Acceptance Criteria:** Every P0 user story has test coverage.

### P1-A12 - Technical Risk Review Agent

**Route:** `agent-12`, `9router/mimo-v2.5-pro`

**Depends on:** `agent-08`, `agent-09`, `agent-10`

**Goal:** Identify MVP technical risks and build-order cutline.

**Tasks:**

- Review risk in Riot API, chat, email digest, matching, admin dashboard, moderation.
- Recommend fallback per risk.
- Recommend build order.
- Define MVP cutline.

**Deliverables:** Risk table, fallback plan, build order, architecture sketch.

**Acceptance Criteria:** Provides practical simplification path.

## 7. Phase 2 Handoffs - Retention Expansion

### P2-A13 - Scrim Room Spec Agent

**Goal:** Define scrim rooms after Team Finding is validated.

**Deliverables:** Scrim creation flow, team-to-team matching, schedule/confirm/result flow, abuse cases.

### P2-A14 - Club Tools Agent

**Goal:** Define university club profile, member list, referral code, club leaderboard, and club admin permissions.

**Deliverables:** Club dashboard spec, roles/permissions, acquisition metrics.

### P2-A15 - Notification and Retention Agent

**Goal:** Define in-app/email notification strategy for Daily Matches, requests, scrims, and events.

**Deliverables:** Notification matrix, triggers, frequency limits, retention KPIs.

## 8. Phase 3 Handoffs - Tournament Operations

### P3-A16 - Tournament Organizer Agent

**Goal:** Define organizer dashboard for creating and managing tournaments.

**Deliverables:** Organizer flow, permissions, event lifecycle, admin controls.

### P3-A17 - Bracket and Match Ops Agent

**Goal:** Define bracket, check-in, result submission, and dispute handling.

**Deliverables:** Bracket states, check-in flow, result approval, dispute lifecycle.

## 9. Phase 4 Handoffs - Monetization and Ecosystem

### P4-A18 - Premium and Club Packages Agent

**Goal:** Define premium player/team features and paid club packages.

**Deliverables:** Pricing tiers, feature gates, upgrade triggers, package comparison.

### P4-A19 - Sponsorship and Coaching Agent

**Goal:** Define sponsor inventory and coaching marketplace path.

**Deliverables:** Sponsor packages, coach profile/booking flow, commission assumptions.

### P4-A20 - Livestream and Creator Agent

**Goal:** Define low-risk livestream expansion through embedded streams before native infrastructure.

**Deliverables:** Embedded event page spec, creator profile, donation roadmap, infrastructure risks.

## 10. Dispatch Waves

### Wave 1 - Phase 0 Foundation

- `agent-01`: PRD Refinement
- `agent-02`: Competitor Research
- `agent-03`: UX Flow Discovery
- `agent-04`: Phase Architecture

### Wave 2 - Phase 1 Core Specs

- `agent-05`: Matching Logic
- `agent-06`: Data Model
- `agent-07`: Admin and Moderation
- `agent-08`: Riot Verification

### Wave 3 - Build Specs and Risk

- `agent-09`: API and Functional Spec
- `agent-10`: Wireframe Spec
- `agent-11`: MVP QA and Beta Readiness
- `agent-12`: Technical Risk Review

### Wave 4 - Future Phase Planning

- `agent-13`: Scrim Room Spec
- `agent-14`: Club Tools
- `agent-15`: Notification and Retention
- `agent-16`: Tournament Organizer
- `agent-17`: Bracket and Match Ops
- `agent-18`: Premium and Club Packages
- `agent-19`: Sponsorship and Coaching
- `agent-20`: Livestream and Creator

## 11. Orchestrator Merge Rules

- Prefer smaller MVP scope when agents disagree.
- Treat Phase 1 as Team Finding only.
- Move complex features to later phases instead of deleting them.
- Do not merge unsupported competitor claims without verification.
- Mark decisions as `proposed` until user approves them.
- Update `AI-CONTEXT.md` after each completed wave.
- Route frontend implementation agents to `9router/vps/glm-5.2`.
