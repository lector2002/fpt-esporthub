# FPT EsportHub - Product PRD, Phase Plan, and Implementation Backlog

## 0. Decisions Locked During Brainstorming

| Decision Area | Locked Decision |
| --- | --- |
| Core wedge | Team finding |
| MVP primary user | Solo players |
| First games | Valorant and League of Legends |
| Matching model | Hybrid Smart Matchmaking: instant recommendations + Daily Matches |
| Match target | Both solo-to-solo and solo-to-team |
| MVP team module | Real team profile, not only posts |
| Main profile fields | Game, rank, role/position, communication style, goal, play schedule |
| Communication style tags | Chill, Try-hard, Quiet focus, Shotcaller, Beginner friendly |
| Player goals | Rank climb, Casual play, Scrim practice, Join tournaments, Find team, Find members |
| Match action | Send request |
| Chat scope | Basic messages after request is accepted |
| Safety scope | Report, block, basic reputation score; AI anti-toxic later |
| Verification | Riot API verification for Valorant/LoL, with fallback if blocked |
| Tournament MVP | Simple event listing + find team for tournament |
| Daily Matches delivery | In-app + email digest |
| Monetization MVP | Free MVP + Premium waitlist |
| Phase 1 KPI level | Conservative |
| Docs format | PRD + startup report summary + implementation backlog |

## 1. Product Requirement Document

### 1.1 Product Name

FPT EsportHub

### 1.2 Product Vision

FPT EsportHub helps Vietnamese student gamers find compatible teammates and teams through verified profiles, structured preferences, Smart Matchmaking, team profiles, and tournament-based team formation.

Long-term, the product can expand into scrims, university club tools, tournament operations, premium features, coaching, sponsorship, and livestream monetization.

### 1.3 MVP Positioning

**FPT EsportHub is a Smart Team Finding platform for student gamers who play Valorant and League of Legends.**

The MVP should not be positioned as a full esports ecosystem yet. The larger ecosystem remains the long-term vision, but the first product must win one pain point clearly: helping solo players find the right people to play with.

### 1.4 Core Problem

Student gamers currently find teammates through Facebook Groups, Discord servers, Messenger chats, or friends. These channels are familiar but weak for structured matching.

Main problems:

- Players cannot easily filter by game, rank, role, schedule, and goal.
- Players often meet teammates with mismatched seriousness, toxic behavior, or wrong communication style.
- Teams cannot recruit suitable members in a structured way.
- Players who want to join tournaments often do not have a complete team.
- Current community channels do not create persistent gaming identity or reputation.

### 1.5 Core Solution

FPT EsportHub creates a structured matching layer on top of the existing student gaming community.

The MVP allows users to:

- Create a player profile.
- Verify Riot account/rank where possible.
- Define play preferences.
- Get Smart Matchmaking recommendations.
- Receive Daily Matches.
- Send match requests.
- Chat after request acceptance.
- Create or join real team profiles.
- Find teammates for tournaments.
- Build basic reputation through safe interactions.

### 1.6 Target Users

#### Primary User: Solo Players

Solo players are gamers who want to find suitable teammates, duo partners, squads, or teams.

Main needs:

- Find players with similar rank and schedule.
- Find players with compatible play style.
- Join a team for rank climb, scrim, or tournament.
- Avoid toxic or unreliable teammates.

#### Secondary User: Teams Looking for Members

Teams need a profile and recruitment pipeline.

Main needs:

- Show what kind of team they are.
- Recruit missing roles.
- Accept or reject applications.
- Build team credibility.

#### Future User: Clubs and Tournament Organizers

Clubs and organizers become important in Phase 2 and Phase 3.

Main needs:

- Organize tournaments.
- Help members form teams.
- Track participation.
- Build school-level esports identity.

### 1.7 MVP Success Definition

MVP is successful if users complete profiles, receive relevant match suggestions, send requests, and form playing relationships or teams.

Conservative Phase 1 KPIs:

- 100-200 registered users.
- 50 completed player profiles.
- 20 teams created.
- 100 match requests sent.
- 30 accepted match requests.
- 1 tournament/event listing used for team finding.
- 20% of users return within 7 days after activation.

Activation is defined as one of these actions:

- User sends a match request.
- User accepts a match request.
- User creates a team.
- User applies to a team.
- User joins a tournament team-finding flow.

## 2. MVP Scope

### 2.1 Must-have Features

| Module | Feature | Description |
| --- | --- | --- |
| Landing | Landing page | Explain value proposition, beta signup, Premium waitlist |
| Account | Register/login | Email/Google login if possible |
| Onboarding | Preference setup | Game, rank, role, goal, schedule, communication style |
| Verification | Riot verification | Verify Riot ID/rank for Valorant/LoL if API access is available |
| Profile | Player profile | Public/semi-public profile for matching |
| Matching | Smart Matchmaking | Rule-based match score with recommended players/teams |
| Matching | Daily Matches | In-app and email digest of suggested matches |
| Team | Real team profile | Team entity with members, captain, recruitment info |
| Request | Match request | User sends request to player/team |
| Chat | Basic messages | Messaging only after request acceptance |
| Tournament | Event listing | List tournament/event pages |
| Tournament | Find team for tournament | Players can look for teammates for a specific event |
| Safety | Report/block | Basic safety actions |
| Reputation | Basic reputation score | Simple trust signal from reports/accepted interactions/manual admin input |
| Admin | Admin dashboard | Manage users, teams, reports, tournaments/events |

### 2.2 Fallback Scope If Time/API Is Blocked

| Risk | Fallback |
| --- | --- |
| Riot API approval takes too long | Allow manual Riot ID/rank input and mark profile as unverified |
| Chat takes too long | Replace with accepted request + contact reveal |
| Email digest takes too long | Use in-app Daily Matches first |
| Reputation score is unclear | Start with visible report count only for admins, not public score |
| Admin dashboard takes too long | Build simple admin tables for user/team/report/event management |

### 2.3 Explicitly Out of MVP

- Mobile app.
- Voice chat.
- Full Discord replacement.
- Full bracket system.
- Automated tournament result tracking.
- Payment and wallet.
- Coaching marketplace.
- Livestream/donation infrastructure.
- AI anti-toxic moderation.
- Complex performance analytics.
- Multi-game expansion beyond Valorant and League of Legends.

## 3. Feature Specifications

### 3.1 Landing Page

Purpose: convert visitors into beta users and measure interest in Premium.

Sections:

- Hero: Find teammates who match your rank, role, schedule, and play style.
- Problem: Facebook and Discord are not built for structured team finding.
- Product demo: Smart Matchmaking, Team Profiles, Tournament Team Finding.
- Supported games: Valorant, League of Legends.
- Beta signup CTA.
- Premium waitlist CTA.
- Club/partner contact CTA.

### 3.2 Onboarding

Required fields:

- Main game: Valorant or League of Legends.
- Current rank.
- Main role/position.
- Play schedule.
- Player goals, maximum 2 selected.
- Communication style, maximum 2 selected.
- Riot ID for verification.

Player goals:

- Rank climb.
- Casual play.
- Scrim practice.
- Join tournaments.
- Find team.
- Find members.

Communication styles:

- Chill.
- Try-hard.
- Quiet focus.
- Shotcaller.
- Beginner friendly.

### 3.3 Player Profile

MVP fields:

- Display name.
- Avatar.
- Main game.
- Rank.
- Riot verification status.
- Role/position.
- Play schedule.
- Player goals.
- Communication style.
- Short bio.
- Looking status: open to match, looking for team, looking for tournament team.
- Reputation indicator.

Future fields:

- Team history.
- Tournament history.
- Match history.
- Achievements.
- Public share link.

### 3.4 Smart Matchmaking

MVP model: rule-based matching score, presented as Smart Matchmaking.

Inputs:

- Same game.
- Rank distance.
- Role compatibility.
- Schedule overlap.
- Goal overlap.
- Communication style compatibility.
- Reputation/safety status.

Recommended scoring example:

| Matching Factor | Suggested Weight |
| --- | --- |
| Same game | Required |
| Rank compatibility | 30% |
| Role compatibility | 20% |
| Schedule overlap | 20% |
| Goal overlap | 15% |
| Communication style | 10% |
| Reputation/safety | 5% |

UX:

- User clicks `Find Match`.
- User selects mode: `Find Players` or `Find Team`.
- System shows recommended matches with match score and reason.
- User sends request.
- Receiver accepts or declines.
- If accepted, basic chat opens.

Match reason examples:

- Same game and close rank.
- Both want Rank climb.
- Same evening schedule.
- Team needs your role.
- Compatible communication style.

### 3.5 Daily Matches

Purpose: create retention without needing users to be online at the same time.

MVP behavior:

- Generate 3-5 suggested matches per user per day or every few days.
- Show Daily Matches in dashboard.
- Send email digest with top matches.

Email subject examples:

- Your Valorant matches for today.
- 3 teams are looking for your role.
- New League of Legends players match your schedule.

### 3.6 Team Profile

Team fields:

- Team name.
- Game.
- Team rank range.
- Needed roles.
- Play schedule.
- Team goal.
- Communication style.
- Captain.
- Members.
- Recruitment status.

Team actions:

- Create team.
- Edit team.
- Invite player.
- Accept/reject player request.
- Remove member.
- Close/open recruitment.

### 3.7 Match Request and Basic Messages

Request states:

- Pending.
- Accepted.
- Declined.
- Cancelled.

Request fields:

- Sender.
- Receiver player or team.
- Message.
- Match mode.
- Related tournament/event if any.

Chat rules:

- Chat opens only after accepted request.
- MVP supports basic text messages.
- No voice chat.
- No group chat unless it is simple team-level chat after joining.

### 3.8 Tournament Event Listing and Find Team for Tournament

MVP tournament features:

- Event list.
- Event detail page.
- Game, date, organizer, rules, registration deadline.
- User can mark interest.
- User can create or join a team-finding pool for that event.
- Team can register interest manually.

Not included in MVP:

- Bracket.
- Payment.
- Check-in.
- Result submission.
- Dispute handling.

### 3.9 Safety and Reputation

MVP safety:

- Report user.
- Report team.
- Block user.
- Admin moderation queue.

Basic reputation score can start simple:

- Positive signal: accepted requests, completed profile, verified Riot ID.
- Negative signal: reports, admin warnings, repeated declined/spam requests.

Do not overclaim AI anti-toxic in MVP. Keep it as Phase 3 or Phase 4 enhancement after chat data exists.

### 3.10 Admin Dashboard

Admin must manage:

- Users.
- Player profiles.
- Teams.
- Match requests.
- Reports.
- Tournament/event listings.
- Basic metrics.

Admin dashboard metrics:

- Registered users.
- Completed profiles.
- Teams created.
- Match requests sent.
- Accepted requests.
- Daily active users.
- Reports opened/resolved.

## 4. User Flows

### 4.1 Solo Player Finds Another Player

1. User registers.
2. User completes onboarding.
3. User clicks `Find Match`.
4. User selects `Find Players`.
5. System shows recommended players with match score.
6. User sends request.
7. Receiver accepts.
8. Basic chat opens.
9. Users decide to play together.
10. Optional: user gives feedback later.

### 4.2 Solo Player Finds a Team

1. User completes profile.
2. User clicks `Find Match`.
3. User selects `Find Team`.
4. System shows teams that need the user's role.
5. User sends request with short intro.
6. Team captain accepts or declines.
7. If accepted, chat opens.
8. Captain adds user to team if both sides agree.

### 4.3 Team Recruits a Member

1. Captain creates team profile.
2. Captain selects needed roles.
3. Team appears in recommendations for relevant players.
4. Captain can also browse suggested players.
5. Captain sends invite.
6. Player accepts.
7. Chat opens.
8. Captain adds player to team.

### 4.4 User Finds Team for Tournament

1. User opens tournament/event detail.
2. User clicks `Find team for this event`.
3. System filters players and teams interested in the event.
4. User sends request.
5. Accepted users form or join a team.
6. Team registers interest for the event.

## 5. Phase Plan

### Phase 0: Prototype and Validation

Time: 2-3 weeks.

Goal: validate that students care about structured teammate finding.

Deliverables:

- Landing page copy.
- Figma prototype for onboarding, profile, Find Match, team profile, tournament event.
- User interview script.
- Beta signup form.
- Premium waitlist form.
- Partner outreach script for esports clubs.

Validation targets:

- 30-50 beta signups.
- 10-15 student gamer interviews.
- 2-3 club leader interviews.
- Clear ranking of top matching criteria.

### Phase 1: MVP and Closed Beta

Time: Month 1-3.

Goal: launch a working Team Finding MVP for Valorant and League of Legends.

Build:

- Landing page + beta signup + Premium waitlist.
- User onboarding.
- Riot verification if possible.
- Player profile.
- Smart Matchmaking hybrid.
- Daily Matches in-app and email digest.
- Real team profile.
- Match request.
- Basic messages after accepted request.
- Simple tournament/event listing.
- Find team for tournament.
- Report/block.
- Basic reputation score.
- Admin dashboard.

Operate:

- Launch closed beta with student gamers.
- Focus on FPT University and nearby student communities first.
- Seed initial users manually.
- Create initial team/event listings manually if needed.
- Collect weekly feedback.

Conservative KPIs:

- 100-200 registered users.
- 50 completed profiles.
- 20 teams created.
- 100 match requests sent.
- 30 accepted match requests.
- 1 tournament/event listing used for team finding.
- 20% D7 return rate after activation.

### Phase 2: Better Matching, Scrims, Clubs, and Retention

Time: Month 4-6.

Goal: improve repeat usage and expand from solo matching to team activity.

Build:

- Better matchmaking score using feedback data.
- Scrim room creation.
- Scrim browse and request.
- Club profile.
- Club member list.
- Club referral code.
- Post-match review.
- Improved reputation system.
- In-app notification system.
- Email reminders.
- Public player/team profile links.

Operate:

- Partner with university clubs.
- Run weekly scrim challenge.
- Encourage teams to invite members.
- Publish leaderboard-style content manually or semi-automatically.

KPIs:

- 500-1,000 registered users.
- 250 completed profiles.
- 50 active teams.
- 100 scrim rooms created.
- 20% users acquired through referral/club links.
- 30% monthly return rate among activated users.

### Phase 3: Tournament Operations

Time: Month 7-9.

Goal: support clubs and organizers with tournament workflows.

Build:

- Organizer dashboard.
- Bracket system.
- Check-in flow.
- Result submission.
- Dispute handling.
- Tournament participant management.
- Tournament communications.

Operate:

- Run inter-university events.
- Let clubs organize tournaments through the platform.
- Partner with cyber games for offline finals.
- Use tournament content for acquisition.

KPIs:

- 2,000+ registered users.
- 100 active teams.
- 5-10 tournaments run through platform.
- 300+ tournament participants.
- 60% tournament teams formed or managed through platform.

### Phase 4: Monetization and Ecosystem Expansion

Time: Month 10-12.

Goal: monetize active players, teams, clubs, and tournaments.

Recommended revenue priority:

1. Premium players and teams.
2. Club packages.
3. Sponsorship.
4. Coaching marketplace.
5. Livestream/donation.

Build:

- Premium subscription.
- Premium badge.
- Priority visibility.
- More Daily Matches or match boosts.
- Advanced team/player analytics.
- Club paid package page.
- Sponsor slots for tournaments.
- Coach profile and booking request.
- Embedded livestream event page.
- Donation/livestream only if product traction is strong.

Operate:

- Launch Premium trial.
- Sell club packages to active clubs.
- Pitch sponsors using tournament/user data.
- Recruit a small number of coaches.
- Use livestream as event content first, not full infrastructure.

KPIs:

- 3,000-5,000 registered users.
- 1,000+ MAU.
- 100-200 paying users or trial users.
- 2-5 paid club/organizer packages.
- 2-3 sponsor campaigns.
- 20+ coaching requests if coaching is launched.

## 6. Startup Report Summary

### 6.1 Product Summary

FPT EsportHub is a web-first Smart Team Finding platform for Vietnamese student gamers. The MVP focuses on Valorant and League of Legends players who need compatible teammates or teams. Instead of replacing Discord or Facebook immediately, the platform adds structure through player profiles, rank/role/schedule filters, Smart Matchmaking, team profiles, match requests, basic messages, and tournament-based team formation.

### 6.2 Why This MVP Is Stronger Than an All-in-one MVP

An all-in-one esports ecosystem is attractive but too large for an early-stage student startup. Building voice chat, livestream, wallet, coaching, tournament automation, and AI moderation at the same time would increase development risk and reduce clarity.

The Team Finding MVP is stronger because:

- The user pain is immediate and easy to understand.
- The product can be tested with small student communities.
- Matching creates data for future scrims, tournaments, reputation, and monetization.
- Teams and profiles become the foundation for later features.
- It is easier to pitch: find better teammates faster than Facebook or Discord.

### 6.3 Differentiation

FPT EsportHub is different from Facebook and Discord because it is structured around esports compatibility, not general communication.

Key differentiators:

- Smart Matchmaking by game, rank, role, schedule, goal, and communication style.
- Real team profiles.
- Tournament-specific team finding.
- Riot verification where possible.
- Basic reputation and safety system.
- Daily Matches to create repeat usage.

### 6.4 Go-to-market Direction

The first market should be student gamers in FPT University and nearby university esports communities. The project should recruit early users through clubs, Facebook Groups, Discord communities, and tournament/event pages, then move them into the platform for structured matching.

Recommended launch message:

**Find teammates who match your rank, role, schedule, and play style.**

Supporting message:

**Stop searching randomly on Facebook and Discord. Let FPT EsportHub recommend players and teams that actually fit you.**

## 7. Implementation Backlog

### 7.1 Product/Research Backlog

| Priority | Task | Output |
| --- | --- | --- |
| P0 | Finalize MVP feature list | Approved scope document |
| P0 | Interview solo players | Interview notes and pain ranking |
| P0 | Interview team captains | Team recruitment requirements |
| P0 | Define match scoring rules | Matching criteria and weights |
| P0 | Define onboarding fields | Final profile schema |
| P1 | Define reputation rules | Reputation model v1 |
| P1 | Define tournament team-finding flow | Event flow spec |
| P2 | Define Premium value proposition | Premium waitlist copy |

### 7.2 UI/UX Backlog

| Priority | Task | Output |
| --- | --- | --- |
| P0 | Landing page wireframe | Landing design |
| P0 | Onboarding flow | Figma screens |
| P0 | Player profile screen | Figma screens |
| P0 | Find Match screen | Figma screens |
| P0 | Match result card | Score + reason UI |
| P0 | Team profile screen | Figma screens |
| P0 | Request/chat flow | Figma screens |
| P1 | Tournament event screen | Figma screens |
| P1 | Admin dashboard wireframe | Admin UI |

### 7.3 Engineering Backlog

| Priority | Task | Notes |
| --- | --- | --- |
| P0 | Setup web app | Web-first MVP |
| P0 | Auth | Email/Google login |
| P0 | User onboarding | Save matching preferences |
| P0 | Player profile CRUD | Create/edit/view profile |
| P0 | Team CRUD | Create/edit/join team |
| P0 | Matching algorithm v1 | Rule-based score |
| P0 | Match request flow | Pending/accepted/declined |
| P0 | Basic messaging | Only after accepted request |
| P0 | Admin dashboard | Users, teams, reports, events |
| P1 | Riot API integration | Use fallback if blocked |
| P1 | Daily Matches in-app | Dashboard recommendations |
| P1 | Email digest | Daily/weekly match email |
| P1 | Report/block | Safety basics |
| P1 | Tournament event listing | Simple event pages |
| P2 | Premium waitlist | Capture interest |

### 7.4 Marketing/Partnership Backlog

| Priority | Task | Output |
| --- | --- | --- |
| P0 | Beta signup campaign | First beta users |
| P0 | Club outreach list | 10-20 target clubs/groups |
| P0 | Outreach message | Partner DM/email template |
| P0 | Facebook/Discord seeding plan | Community posts |
| P1 | Launch content | TikTok/Facebook posts |
| P1 | Tournament/event partner | First event listing |
| P1 | Feedback collection | Weekly survey |
| P2 | Premium waitlist campaign | Demand signal |

### 7.5 Business/Finance Backlog

| Priority | Task | Output |
| --- | --- | --- |
| P0 | Cost estimate for MVP | Hosting, domain, tools, marketing |
| P0 | Phase budget | Budget by phase |
| P1 | Premium pricing draft | Student-friendly pricing |
| P1 | Club package draft | B2B package idea |
| P2 | Sponsor package draft | Tournament sponsor deck |
| P2 | Revenue forecast | Conservative forecast |

## 8. Suggested Data Model

MVP entities:

- User.
- PlayerProfile.
- Game.
- Team.
- TeamMember.
- MatchPreference.
- MatchRecommendation.
- MatchRequest.
- Message.
- TournamentEvent.
- EventInterest.
- Report.
- ReputationRecord.
- AdminUser.

Phase 2 entities:

- ScrimRoom.
- ScrimRequest.
- Club.
- ClubMember.
- Notification.
- ReferralCode.
- Review.

Phase 3 entities:

- Tournament.
- Bracket.
- Match.
- CheckIn.
- ResultSubmission.
- Dispute.

Phase 4 entities:

- Subscription.
- Payment.
- PremiumFeatureUsage.
- CoachProfile.
- CoachingRequest.
- SponsorCampaign.
- LivestreamEvent.

## 9. Open Questions for Next Brainstorming Session

These should be decided next:

1. Exact rank buckets for Valorant and League of Legends.
2. Exact role options for both games.
3. How strict schedule matching should be.
4. Whether user can choose more than one main game in MVP.
5. Whether reputation score is public or admin-only in Phase 1.
6. Whether accepted request should reveal external contact or keep users fully in-app.
7. Whether Daily Matches are daily or 2-3 times per week.
8. What data is required for Premium waitlist.
9. Which club/community will be first beta partner.
10. Which tournament/event will be used to test team finding.

## 10. Final Recommended Product Narrative

FPT EsportHub should start as a Smart Team Finding platform for student gamers, not as a broad all-in-one esports ecosystem. The first version focuses on solo Valorant and League of Legends players who want compatible teammates or teams. Users create structured player profiles, set goals and communication style, receive Smart Matchmaking recommendations and Daily Matches, send requests, chat after acceptance, and form real teams. Tournament event listings help users find teammates for specific competitions.

After this core behavior is validated, the platform can expand into scrim rooms, club tools, tournament operations, premium subscriptions, coaching, sponsorship, and livestream monetization.
