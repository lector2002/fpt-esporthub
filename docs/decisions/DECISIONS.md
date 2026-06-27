# FPT EsportHub Decision Log

## 2026-06-26

### D01 - Project Level

Decision: Treat FPT EsportHub as a Large project.

Reason: The user clarified this will become a large codebase project with multiple phases and many product modules.

Impact:

- Maintain `AI-CONTEXT.md`.
- Use phase-based docs.
- Use `.swarm/` orchestration for AI subagents.

### D02 - MVP Wedge

Decision: Phase 1 MVP focuses on Smart Team Finding.

Reason: Team finding is the clearest pain point and avoids overbuilding the all-in-one esports ecosystem before validating demand.

Impact:

- Phase 1 excludes full tournament system, voice chat, livestream, wallet, coaching marketplace, and AI anti-toxic.

### D03 - Primary MVP User

Decision: Primary MVP user is solo student gamer.

Reason: Solo players have the clearest problem: finding compatible teammates or teams.

Impact:

- Onboarding, profile, matching, request, and chat flows optimize for solo players first.

### D04 - First Games

Decision: Phase 1 supports Valorant and League of Legends.

Reason: Both games have structured rank/role systems and fit student esports behavior.

Impact:

- Data model and matching logic include game-specific ranks and roles.

### D05 - Matching Model

Decision: Smart Matchmaking is rule-based in Phase 1.

Reason: ML/AI matching requires data and complexity that the MVP will not have.

Impact:

- Matching uses game, rank, role, schedule, goal, communication style, verification, and reputation.

### D06 - Chat Scope

Decision: Phase 1 chat is basic async text messaging after accepted match request.

Reason: It supports coordination without requiring real-time infrastructure or group chat.

Impact:

- No voice chat.
- No file sharing.
- No group chat in Phase 1.
- Conversation opens only after request acceptance.

### D07 - Email Digest

Decision: Email digest moves to Phase 2.

Reason: Email infrastructure, deliverability, templates, and unsubscribe management add complexity and do not block core matching.

Impact:

- Phase 1 Daily Matches are in-app only.
- Phase 2 can add email digest and notification expansion.

### D08 - Reputation Visibility

Decision: Reputation is public in Phase 1, but must be simple.

Reason: Public trust signal helps reduce uncertainty in team finding.

Implementation guidance:

- Public display should be tier/badge-based, not a detailed numeric score.
- Admin can see numeric score and breakdown.
- MVP public tiers can be `New`, `Verified`, `Trusted`, `Caution`.

Impact:

- Phase 1 UI shows simple reputation badge on profile/match cards.
- Detailed reputation history remains admin-only.

### D09 - Riot Verification

Decision: Riot verification is approved as best-effort with fallback.

Reason: Verification improves trust, but API approval can delay the project.

Impact:

- Phase 1 must support manual Riot ID + self-reported rank.
- API-verified accounts get a verified badge when available.
- MVP must not be blocked by Riot API approval.

### D10 - Phase 1 Main Build Spec

Decision: Create `docs/phase-1/MVP-Build-Spec.md` as the main implementation handoff.

Reason: Agent outputs are useful but fragmented. A single build spec is needed for dev/design/task assignment.

Impact:

- Phase 1 work should reference `docs/phase-1/MVP-Build-Spec.md` first.

### D11 - Tech Stack

Decision: Use `Next.js + NestJS + PostgreSQL + Prisma` with a WebSocket-ready backend.

Reason: The project needs a real closed beta product later, the team is full-stack balanced, and future requirements include a full chat system plus multi-phase product modules.

Impact:

- Frontend and backend are separate applications.
- Backend owns business rules, permissions, matching, moderation, and chat rules.
- Phase 1 chat stays async REST, but the data model and backend modules prepare for WebSocket in Phase 2.
- Supabase or Neon can still be used as managed PostgreSQL hosting, but not as the main business-logic layer.

### D12 - Deployment Direction

Decision: Use Vercel for frontend, Railway/Render/Fly.io for backend, and Supabase Postgres or Neon for database.

Reason: This gives fast student-project deployment while keeping architecture realistic for closed beta.

Impact:

- Phase 1 setup must include separate frontend/backend environment variables.
- Database migrations should be managed through Prisma.

### D13 - Frontend Model Routing

Decision: Route frontend/UI implementation tasks to `9router/vps/glm-5.2`.

Reason: User explicitly requested frontend tasks use `vps/glm-5.2` through provider `9router`.

Impact:

- Frontend implementation agents should use `9router/vps/glm-5.2`.
- Backend, architecture, research, and planning agents keep the previous model routing unless the user changes it.
- Handoff docs and convoy routing should mark frontend tasks separately.
