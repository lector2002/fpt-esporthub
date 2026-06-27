# FPT EsportHub - AI Subagent Handoff Tasks

## 1. Purpose

This document breaks Phase 0 and Phase 1 work into detailed handoff tasks for AI subagents.

Each subagent should be able to take one task, understand the context, produce a clear artifact, and hand results back for integration into the main product docs or project report.

## 2. Source Context for All Subagents

All subagents must use these project decisions as fixed context unless the task explicitly asks them to challenge assumptions.

| Area | Decision |
| --- | --- |
| Product | FPT EsportHub |
| MVP wedge | Team finding |
| Primary user | Solo student gamers |
| First games | Valorant and League of Legends |
| Matching model | Hybrid Smart Matchmaking: instant recommendations + Daily Matches |
| Match targets | Solo-to-solo and solo-to-team |
| Team module | Real team profile |
| Match action | Send request |
| Chat scope | Basic messages after request acceptance |
| Safety | Report, block, basic reputation score |
| Verification | Riot API if possible, fallback to manual/unverified profile |
| Tournament MVP | Simple event listing + find team for tournament |
| Monetization MVP | Free MVP + Premium waitlist |
| Phase focus | Phase 0 prototype/validation + Phase 1 MVP |

Primary reference file:

- `docs/FPT-EsportHub-Product-Structure-and-Phase-Plan.md`

Original report reference:

- `docs/Group 1 - FPT Esport Hub - Checkpoint 3 - Report.md`

## 3. Handoff Format for Subagents

Each subagent output should include:

- `Summary`: 5-8 bullet points of key decisions/findings.
- `Detailed Work`: full artifact requested by the task.
- `Assumptions`: assumptions made because information was missing.
- `Open Questions`: decisions the main team must still make.
- `Recommended Next Actions`: concrete next steps.
- `Files/Sections to Update`: where the result should be merged.

Constraints:

- Keep MVP realistic for a student startup project.
- Do not expand MVP beyond Team Finding unless required by dependency.
- Prefer web-first assumptions.
- Treat AI anti-toxic, livestream, wallet, and full tournament automation as later phases.
- Use clear tables where possible.
- Avoid vague claims; tie recommendations to product behavior.

## 4. Task Dependency Map

Recommended execution order:

1. `T01`, `T02`, `T03` can run in parallel.
2. `T04`, `T05`, `T06` depend on `T01` and the current PRD.
3. `T07`, `T08`, `T09` depend on `T04`, `T05`, `T06`.
4. `T10`, `T11` depend on `T07`, `T08`, `T09`.
5. `T12`, `T13`, `T14` can run after most specs are available.

| Task ID | Workstream | Can Run Early | Depends On |
| --- | --- | --- | --- |
| T01 | PRD refinement | Yes | Product plan |
| T02 | Competitor research | Yes | Product plan |
| T03 | UX flow discovery | Yes | Product plan |
| T04 | Matching logic | After T01 | T01 |
| T05 | Data model | After T01 | T01 |
| T06 | Admin/moderation spec | After T01 | T01 |
| T07 | API/spec | After T04/T05 | T04, T05, T06 |
| T08 | UX wireframe spec | After T03/T04 | T03, T04, T05 |
| T09 | Riot verification research | After T01 | T01, T04 |
| T10 | MVP acceptance test plan | After specs | T04, T05, T07, T08 |
| T11 | Technical risk review | After specs | T07, T09 |
| T12 | Report integration | Later | T01-T11 |
| T13 | Presentation/pitch synthesis | Later | T01-T11 |
| T14 | Final backlog cleanup | Later | T01-T11 |

## 5. Subagent Tasks

### T01 - PRD Refinement Agent

**Workstream:** PRD refinement

**Priority:** P0

**Phase:** Phase 0

**Goal:** Convert the current product plan into a cleaner MVP PRD with explicit user stories, feature priority, and acceptance criteria.

**Context:**

FPT EsportHub MVP is a Team Finding platform for solo Valorant and League of Legends student gamers. The current PRD exists but needs sharper user stories and build-ready feature definitions.

**Inputs:**

- `docs/FPT-EsportHub-Product-Structure-and-Phase-Plan.md`

**Scope:**

- Review the current PRD.
- Identify ambiguous or oversized MVP items.
- Rewrite MVP scope into user stories.
- Define P0/P1/P2 priorities for Phase 1 only.
- Define acceptance criteria for each P0 feature.
- Identify dependencies between features.

**Deliverables:**

- `MVP PRD v2` in markdown.
- User story table with columns: `ID`, `User`, `Need`, `Feature`, `Priority`, `Acceptance Criteria`.
- Feature priority table.
- List of assumptions and open questions.

**Acceptance Criteria:**

- Every P0 feature has at least one user story.
- Every P0 feature has testable acceptance criteria.
- Scope does not include full tournament bracket, payment, voice chat, livestream, or coaching marketplace.
- Output can be merged into the product plan without rewriting from scratch.

**Suggested Prompt for Subagent:**

```text
You are the PRD refinement agent for FPT EsportHub. Read `docs/FPT-EsportHub-Product-Structure-and-Phase-Plan.md`. Produce a build-ready MVP PRD v2 for Phase 1. The product is a Team Finding platform for solo student gamers playing Valorant and League of Legends. Keep scope realistic. Convert features into user stories and acceptance criteria. Flag ambiguity and oversized items. Do not add payment, full tournament automation, voice chat, livestream, or coaching marketplace to MVP.
```

---

### T02 - Competitor Research Agent

**Workstream:** Competitor research

**Priority:** P0

**Phase:** Phase 0

**Goal:** Compare FPT EsportHub against existing alternatives and identify a defensible MVP differentiation.

**Context:**

Users currently use Facebook Groups, Discord, informal chats, and possibly platforms such as FACEIT, Challengermode, Toornament, Battlefy, or local gaming communities. The MVP must explain why users should switch or add FPT EsportHub to their workflow.

**Inputs:**

- Current product plan.
- Public knowledge/web research if available.

**Scope:**

- Research/compare alternatives: Facebook Groups, Discord, FACEIT, Challengermode/Battlefy/Toornament, local Vietnamese gaming communities if known.
- Compare by teammate finding, team profile, rank/role filters, tournament support, trust/reputation, student/community focus, ease of use.
- Identify gaps that FPT EsportHub can realistically exploit.
- Recommend MVP positioning and landing page claims.

**Deliverables:**

- Competitor comparison table.
- Differentiation summary.
- MVP positioning recommendations.
- Risks: where competitors are stronger.
- Claims to avoid because they are not yet proven.

**Acceptance Criteria:**

- At least 5 alternatives compared.
- Clear conclusion on why Team Finding is the best wedge.
- Recommendations are realistic for Phase 1.
- Output includes language usable in report/pitch.

**Suggested Prompt for Subagent:**

```text
You are the competitor research agent for FPT EsportHub. Compare the MVP against Facebook Groups, Discord, FACEIT, and tournament/community platforms such as Challengermode, Battlefy, or Toornament. Focus on teammate/team finding for Valorant and League of Legends student gamers. Produce a comparison table, differentiation, risks, and landing page claims. Keep recommendations realistic for a Phase 1 MVP.
```

---

### T03 - UX Flow Discovery Agent

**Workstream:** UX wireframe

**Priority:** P0

**Phase:** Phase 0

**Goal:** Define the end-to-end user flows before screen-level wireframes are created.

**Context:**

The product needs clean flows for onboarding, profile creation, finding players, finding teams, request acceptance, basic chat, creating teams, and finding team for tournament.

**Inputs:**

- Product plan.
- Locked decisions table.

**Scope:**

- Define primary flows:
  - New user onboarding.
  - Solo player finds player.
  - Solo player finds team.
  - Captain creates team and recruits member.
  - User finds team for tournament.
  - User reports/blocks another user.
- Identify required screens per flow.
- Identify friction points and simplifications.

**Deliverables:**

- User flow diagrams in text form.
- Screen inventory.
- Flow priority table.
- UX risks and simplification recommendations.

**Acceptance Criteria:**

- Each primary flow has start, steps, success state, and failure/empty state.
- Screen inventory separates MVP vs later.
- Output is usable by T08 UX wireframe spec.

**Suggested Prompt for Subagent:**

```text
You are the UX flow discovery agent for FPT EsportHub. Define end-to-end MVP user flows for onboarding, player matching, team matching, team creation/recruitment, tournament team-finding, and report/block. Do not design visuals yet. Produce text flow diagrams, screen inventory, empty states, and UX risks. Keep MVP web-first.
```

---

### T04 - Matching Logic Agent

**Workstream:** Matching logic

**Priority:** P0

**Phase:** Phase 0/1

**Goal:** Design the rule-based Smart Matchmaking logic for MVP.

**Context:**

The product will call the feature Smart Matchmaking, but Phase 1 should use transparent rule-based scoring, not complex AI. Matching must support solo-to-solo and solo-to-team.

**Inputs:**

- Product plan.
- PRD refinement from T01 if available.

**Scope:**

- Define score formula for solo-to-solo.
- Define score formula for solo-to-team.
- Define required inputs.
- Define rank distance handling for Valorant and League of Legends.
- Define role compatibility rules for both games.
- Define schedule overlap logic.
- Define goal and communication style compatibility.
- Define recommendation explanation text.
- Define edge cases and fallbacks.

**Deliverables:**

- Matching criteria table.
- Scoring formula.
- Example match calculations.
- Pseudocode.
- Edge cases.
- Open questions for rank/role exact options.

**Acceptance Criteria:**

- Scoring supports both player recommendations and team recommendations.
- Formula is understandable and implementable.
- Output explains why a match was recommended.
- No dependence on large training data or machine learning.

**Suggested Prompt for Subagent:**

```text
You are the matching logic agent for FPT EsportHub. Design a rule-based Smart Matchmaking system for a Phase 1 MVP. It must support solo-to-solo and solo-to-team recommendations for Valorant and League of Legends. Use inputs: game, rank, role, schedule, goal, communication style, reputation/verification. Produce scoring tables, formula, pseudocode, examples, edge cases, and recommendation explanation copy. Do not use ML or require large data.
```

---

### T05 - Data Model Agent

**Workstream:** Data model

**Priority:** P0

**Phase:** Phase 1

**Goal:** Define the MVP data model needed to support onboarding, profiles, teams, matching, requests, messages, event listing, safety, and admin.

**Context:**

The current plan lists possible entities but needs a sharper MVP schema and relationships.

**Inputs:**

- Product plan.
- T04 matching logic if available.

**Scope:**

- Define MVP entities.
- Define fields for each entity.
- Define relationships.
- Define enum values for game, role, goals, communication styles, request states.
- Define what data is required vs optional.
- Note privacy/safety considerations.

**Deliverables:**

- Entity relationship summary.
- Entity field tables.
- Enum list.
- Data lifecycle notes.
- Questions for engineering implementation.

**Acceptance Criteria:**

- Covers all MVP features.
- Separates MVP entities from Phase 2+ entities.
- Supports matching score calculation.
- Supports admin moderation.

**Suggested Prompt for Subagent:**

```text
You are the data model agent for FPT EsportHub. Define a Phase 1 MVP schema for onboarding, player profiles, teams, matching recommendations, match requests, basic messages, tournament/event listings, reports, reputation, and admin. Produce entity tables, relationships, enums, required/optional fields, and privacy notes. Keep Phase 2+ entities separate.
```

---

### T06 - Admin and Moderation Spec Agent

**Workstream:** Admin/moderation

**Priority:** P0

**Phase:** Phase 1

**Goal:** Specify basic safety, moderation, report/block, reputation, and admin dashboard needs for MVP.

**Context:**

The product needs trust because teammate matching can create toxic or unsafe interactions. MVP safety should be practical, not overbuilt.

**Inputs:**

- Product plan.
- Data model from T05 if available.

**Scope:**

- Define report flow.
- Define block behavior.
- Define admin moderation queue.
- Define basic reputation score logic.
- Define what is public vs admin-only.
- Define abuse/spam prevention rules.
- Define admin dashboard sections.

**Deliverables:**

- Moderation flow spec.
- Admin dashboard feature list.
- Reputation v1 proposal.
- Abuse case table.
- Acceptance criteria.

**Acceptance Criteria:**

- Does not depend on AI anti-toxic.
- Includes report lifecycle: submitted, reviewing, resolved, dismissed.
- Clearly states what users see and what admins see.
- Supports MVP operations with small team capacity.

**Suggested Prompt for Subagent:**

```text
You are the admin and moderation spec agent for FPT EsportHub. Design MVP safety operations: report, block, admin moderation queue, basic reputation score, abuse/spam prevention, and admin dashboard sections. Keep it practical for a small student team. Do not use AI anti-toxic in MVP. Clearly define user-visible vs admin-only information.
```

---

### T07 - API and Functional Spec Agent

**Workstream:** API/spec

**Priority:** P0

**Phase:** Phase 1

**Goal:** Convert MVP features into functional API-level specs and permissions.

**Context:**

This task should make the MVP easier for engineering agents or developers to implement. It should not assume a specific framework unless needed.

**Inputs:**

- T01 PRD refinement.
- T04 matching logic.
- T05 data model.
- T06 admin/moderation spec.

**Scope:**

- Define API resources.
- Define main endpoints for auth/profile/team/matching/request/message/event/report/admin.
- Define request/response examples.
- Define permissions.
- Define validation rules.
- Define error cases.

**Deliverables:**

- Functional API spec in markdown.
- Endpoint table.
- Permission matrix.
- Error/validation rules.
- Implementation notes.

**Acceptance Criteria:**

- Covers all P0 MVP flows.
- Includes admin endpoints or admin operations.
- Matching endpoint returns score and explanation.
- Request/chat endpoints enforce accepted-request rule.

**Suggested Prompt for Subagent:**

```text
You are the API and functional spec agent for FPT EsportHub. Using the PRD, matching logic, data model, and moderation spec, define framework-agnostic API resources/endpoints for the Phase 1 MVP. Include endpoint table, request/response examples, permissions, validation rules, and error cases. Ensure matching returns score and reasons, and chat only opens after accepted request.
```

---

### T08 - UX Wireframe Spec Agent

**Workstream:** UX wireframe

**Priority:** P0

**Phase:** Phase 0/1

**Goal:** Turn user flows into wireframe-ready screen specifications.

**Context:**

This agent does not need to create Figma, but should define exactly what each screen contains so a designer or UI agent can build screens.

**Inputs:**

- T03 UX flow discovery.
- T04 matching logic.
- T05 data model.

**Scope:**

- Define MVP screens.
- For each screen, list purpose, components, fields, CTAs, empty states, validation errors.
- Define navigation structure.
- Define mobile-responsive notes.
- Define information hierarchy.

**Deliverables:**

- Screen spec table.
- Detailed screen specs.
- Navigation map.
- Empty/loading/error state list.
- Copy suggestions for key CTAs.

**Acceptance Criteria:**

- Covers onboarding, profile, Find Match, match results, request, chat, team profile, event listing, admin basics.
- Each screen has clear primary CTA.
- Matching result card includes score and reason.
- Output can be handed to a UI designer/agent.

**Suggested Prompt for Subagent:**

```text
You are the UX wireframe spec agent for FPT EsportHub. Turn the MVP user flows into wireframe-ready screen specs. Define screens, components, fields, CTAs, empty states, validation errors, navigation, responsive notes, and key copy. Do not create visual design; create detailed screen requirements for a designer or UI agent.
```

---

### T09 - Riot Verification Research Agent

**Workstream:** API/spec + risk research

**Priority:** P1

**Phase:** Phase 0/1

**Goal:** Research how Riot verification could work for Valorant and League of Legends, and define a fallback if access is blocked.

**Context:**

The team wants Riot API verification in MVP, but API access, policy, and game-specific limitations may be difficult. The product needs a realistic plan.

**Inputs:**

- Product plan.
- Matching logic requirements.

**Scope:**

- Research Riot API feasibility for account/rank verification.
- Identify required developer access and limitations.
- Identify what can be verified for LoL vs Valorant.
- Define fallback verification options.
- Recommend MVP implementation path.

**Deliverables:**

- Riot API feasibility summary.
- Verification flow options.
- Risk table.
- Fallback plan.
- Recommended MVP wording for verified/unverified profiles.

**Acceptance Criteria:**

- Clearly separates confirmed feasible vs uncertain items.
- Includes fallback if API access is not available.
- Provides product copy for verification labels.
- Does not block MVP on API approval.

**Suggested Prompt for Subagent:**

```text
You are the Riot verification research agent for FPT EsportHub. Research how Riot API verification could support Valorant and League of Legends profile/rank verification. Identify limitations, access requirements, risks, and fallback options. Recommend a Phase 1 implementation that does not block MVP if API access is delayed. Provide wording for verified/unverified profile states.
```

---

### T10 - MVP Acceptance Test Plan Agent

**Workstream:** QA/spec

**Priority:** P1

**Phase:** Phase 1

**Goal:** Define how to test whether the MVP works before beta launch.

**Context:**

The team needs a practical test plan for critical flows, not exhaustive enterprise QA.

**Inputs:**

- PRD/user stories.
- UX flow/spec.
- API spec.

**Scope:**

- Define test scenarios for onboarding, profile, matching, team, request, chat, event, report/block, admin.
- Define happy paths and failure paths.
- Define pre-beta checklist.
- Define beta feedback collection method.

**Deliverables:**

- Test scenario table.
- Manual QA checklist.
- Beta launch readiness checklist.
- Feedback survey questions.

**Acceptance Criteria:**

- Every P0 user story has at least one test scenario.
- Includes negative cases and empty states.
- Includes acceptance threshold for beta readiness.

**Suggested Prompt for Subagent:**

```text
You are the MVP acceptance test plan agent for FPT EsportHub. Create a practical QA and beta readiness plan for the Phase 1 MVP. Cover onboarding, profile, matching, team, request, chat, event listing, report/block, and admin. Include happy paths, failure paths, manual QA checklist, launch readiness checklist, and feedback survey questions.
```

---

### T11 - Technical Risk Review Agent

**Workstream:** Engineering review

**Priority:** P1

**Phase:** Phase 1

**Goal:** Identify technical risks in the MVP scope and recommend simplifications.

**Context:**

The current MVP includes matching, Riot verification, basic chat, email digest, admin dashboard, and safety. Some items may be heavy for Phase 1.

**Inputs:**

- Product plan.
- API spec.
- Riot verification research.
- UX spec.

**Scope:**

- Review implementation complexity.
- Identify high-risk features.
- Propose fallback options.
- Prioritize what to build first.
- Recommend minimal stack-agnostic architecture.

**Deliverables:**

- Technical risk table.
- Build order recommendation.
- Fallback plan.
- MVP cutline: must-have vs can-delay.
- Architecture sketch in text.

**Acceptance Criteria:**

- Identifies risks in Riot API, chat, email, matching, admin, moderation.
- Provides practical fallback for each risk.
- Keeps MVP usable even if P1 items are delayed.

**Suggested Prompt for Subagent:**

```text
You are the technical risk review agent for FPT EsportHub. Review the Phase 1 MVP scope and identify engineering risks around Riot API, chat, email digest, matching, admin dashboard, and moderation. Recommend build order, fallback options, and a minimal architecture. Keep recommendations stack-agnostic and realistic for a student project.
```

---

### T12 - EXE101 Report Integration Agent

**Workstream:** Pitch/report

**Priority:** P1

**Phase:** Phase 0/1

**Goal:** Convert product decisions and subagent outputs into report-ready academic content.

**Context:**

The original report has a broad all-in-one vision. The updated product plan narrows MVP to Team Finding. The report should explain this as a strategic MVP focus, not a contradiction.

**Inputs:**

- Original report.
- Product plan.
- Outputs from T01-T11 if available.

**Scope:**

- Rewrite product strategy section around Team Finding MVP.
- Explain phased expansion to scrim, tournament, premium, coaching, livestream.
- Produce academic-style wording for EXE101.
- Add feature roadmap table.
- Add risk/mitigation table.

**Deliverables:**

- Report-ready section in markdown.
- Roadmap table.
- MVP rationale paragraph.
- Risk mitigation paragraph/table.

**Acceptance Criteria:**

- Tone fits business/startup course report.
- Clearly explains why MVP is narrower than long-term ecosystem.
- Does not remove long-term vision.

**Suggested Prompt for Subagent:**

```text
You are the EXE101 report integration agent for FPT EsportHub. Convert the updated Team Finding MVP strategy into report-ready academic content. Explain why a focused MVP is better than building the full all-in-one ecosystem first. Preserve the long-term roadmap: scrim, tournament, premium, coaching, livestream. Produce sections that can be merged into the report.
```

---

### T13 - Pitch and Presentation Agent

**Workstream:** Pitch/report

**Priority:** P2

**Phase:** Phase 0/1

**Goal:** Create a concise pitch structure for presenting the MVP and roadmap.

**Context:**

The team likely needs to present the startup project. The pitch should be clear and not overloaded with features.

**Inputs:**

- Product plan.
- Competitor research.
- PRD summary.
- Roadmap.

**Scope:**

- Define slide structure.
- Write slide headlines.
- Write short speaking notes.
- Include problem, solution, market, MVP, differentiation, roadmap, monetization, KPIs.

**Deliverables:**

- Slide outline.
- Speaking notes.
- One-sentence pitch.
- 30-second pitch.
- 2-minute pitch.

**Acceptance Criteria:**

- Pitch clearly starts with Team Finding.
- Long-term ecosystem appears as roadmap, not MVP claim.
- Uses simple language for non-technical audience.

**Suggested Prompt for Subagent:**

```text
You are the pitch and presentation agent for FPT EsportHub. Create a concise slide outline and speaking notes for a startup class presentation. The MVP is Smart Team Finding for Valorant and League of Legends student gamers. Include problem, solution, target users, differentiation, MVP, roadmap, monetization, and KPIs. Keep long-term ecosystem as roadmap, not MVP.
```

---

### T14 - Final Backlog Cleanup Agent

**Workstream:** PRD refinement + project management

**Priority:** P1

**Phase:** Phase 0/1

**Goal:** Merge all subagent outputs into a clean implementation backlog with owners, dependencies, and done criteria.

**Context:**

After subagents finish, the team needs a single execution list for Phase 0 and Phase 1.

**Inputs:**

- Outputs from T01-T13.

**Scope:**

- Consolidate tasks.
- Remove duplicates.
- Resolve conflicts.
- Create backlog grouped by Product, UX, Engineering, Admin/Safety, Marketing/Report.
- Add dependencies and done criteria.
- Mark P0/P1/P2.

**Deliverables:**

- Final Phase 0/1 backlog.
- Dependency map.
- Definition of Done per major task.
- Risk/cutline list.

**Acceptance Criteria:**

- Backlog is actionable.
- Every P0 task maps to a user flow or MVP KPI.
- Dependencies are clear.
- Scope remains realistic.

**Suggested Prompt for Subagent:**

```text
You are the final backlog cleanup agent for FPT EsportHub. Merge all subagent outputs into one actionable Phase 0/1 backlog. Group tasks by Product, UX, Engineering, Admin/Safety, and Marketing/Report. Add priority, dependencies, owner type, deliverable, and definition of done. Remove duplicates and flag conflicts. Keep scope realistic for the Team Finding MVP.
```

## 6. Recommended Parallel Dispatch Plan

### Wave 1: Foundation

Run in parallel:

- `T01 - PRD Refinement Agent`
- `T02 - Competitor Research Agent`
- `T03 - UX Flow Discovery Agent`

Expected output:

- Clearer MVP scope.
- Differentiation.
- User flows.

### Wave 2: Core Specs

Run after Wave 1:

- `T04 - Matching Logic Agent`
- `T05 - Data Model Agent`
- `T06 - Admin and Moderation Spec Agent`
- `T09 - Riot Verification Research Agent`

Expected output:

- Matching algorithm.
- Schema.
- Safety/admin logic.
- Verification feasibility.

### Wave 3: Build Specs

Run after Wave 2:

- `T07 - API and Functional Spec Agent`
- `T08 - UX Wireframe Spec Agent`
- `T10 - MVP Acceptance Test Plan Agent`
- `T11 - Technical Risk Review Agent`

Expected output:

- Build-ready functional specs.
- Screen specs.
- QA plan.
- Technical cutline.

### Wave 4: Packaging

Run after Wave 3:

- `T12 - EXE101 Report Integration Agent`
- `T13 - Pitch and Presentation Agent`
- `T14 - Final Backlog Cleanup Agent`

Expected output:

- Report-ready content.
- Presentation structure.
- Final execution backlog.

## 7. Integration Instructions

When a subagent returns output:

1. Check whether it respects locked decisions.
2. Extract new decisions into the `Decisions Locked` table if approved.
3. Merge stable product decisions into `docs/FPT-EsportHub-Product-Structure-and-Phase-Plan.md`.
4. Keep raw subagent outputs in a separate folder if needed, for example `docs/subagent-outputs/`.
5. If two subagents conflict, prefer the simpler MVP option unless the more complex option is necessary for the core Team Finding flow.
6. Update final backlog only after core specs are stable.

## 8. Current Recommended Next Action

Start with Wave 1:

- Dispatch `T01` to refine PRD.
- Dispatch `T02` to research competitors.
- Dispatch `T03` to define UX flows.

These three can run in parallel and will provide the foundation for all later agents.
