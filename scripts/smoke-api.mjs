// End-to-end API smoke test against a running API with seeded data.
// Creates two throwaway users per run (smoke+<ts>-a/b@example.com) and exercises the core loop plus safety rules.
// Sign-up needs the emailed link, so new users are confirmed straight in the database (DATABASE_URL or the root .env).
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@fpt-esporthub/database";

const apiUrl = process.env.API_URL ?? "http://localhost:4000/api/v1";
const adminEmail = process.env.SMOKE_ADMIN_EMAIL ?? "admin@fpt-esporthub.local";
const password = process.env.SMOKE_PASSWORD ?? "Password123!";
const LOL = "league_of_legends";

let failures = 0;

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const line = existsSync(".env") ? readFileSync(".env", "utf8").split(/\r?\n/).find((row) => row.startsWith("DATABASE_URL=")) : undefined;
  return line?.slice("DATABASE_URL=".length).replace(/^["']|["']$/g, "");
}
const prisma = new PrismaClient({ datasourceUrl: databaseUrl() });

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

function check(name, ok, detail = "") {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok || !detail ? "" : ` -> ${detail}`}`);
}

/** Multipart upload with a `file` part plus text fields, like the web uploaders send. */
async function upload(method, path, { token, file, fields = {} }) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  if (file) form.append("file", new Blob([file.bytes], { type: file.type }), file.name);
  const response = await fetch(`${apiUrl}${path}`, { method, headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
  const text = await response.text();
  return { status: response.status, body: text && response.headers.get("content-type")?.includes("json") ? JSON.parse(text) : null, response };
}

// 8x8 orange PNG.
const PNG = { bytes: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVR4nGP4UG+DFTEMLQkA4y9qwfgMuecAAAAASUVORK5CYII=", "base64"), type: "image/png", name: "pic.png" };

async function expectStatus(name, expected, method, path, options) {
  const result = await call(method, path, options);
  check(name, result.status === expected, `${result.status} ${JSON.stringify(result.body)?.slice(0, 200)}`);
  return result.body;
}

async function createPlayer(tag) {
  const email = `smoke+${Date.now()}-${tag}@example.com`;
  const registered = await expectStatus(`register ${tag}`, 201, "POST", "/auth/register", {
    body: { email, password, displayName: `Smoke ${tag.toUpperCase()}` },
  });
  check(`register ${tag} returns no session`, registered && !("accessToken" in registered));
  await expectStatus(`login ${tag} refused before email confirmed`, 403, "POST", "/auth/login", { body: { email, password } });
  await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });
  const { accessToken, user } = await expectStatus(`login ${tag}`, 201, "POST", "/auth/login", { body: { email, password } });
  await expectStatus(`onboarding ${tag}`, 201, "POST", "/profiles/onboarding", {
    token: accessToken,
    body: {
      game: LOL,
      rankTier: "Gold",
      rankLevel: 2,
      role: "mid",
      schedule: ["weekday_evening"],
      goals: ["rank_climb"],
      communicationStyles: ["chill"],
    },
  });
  return { email, token: accessToken, id: user.id };
}

await expectStatus("health", 200, "GET", "/health");
await expectStatus("login rejects wrong password", 401, "POST", "/auth/login", { body: { email: adminEmail, password: "wrong-password" } });
await expectStatus("verify-email rejects an unknown link", 400, "POST", "/auth/verify-email", { body: { token: "0".repeat(64) } });

const a = await createPlayer("a");
const b = await createPlayer("b");

// Core loop: find, request, accept, chat.
const found = await expectStatus("find players", 201, "POST", "/match/find", { token: a.token, body: { mode: "find_players", game: LOL } });
check("find returns matches array", Array.isArray(found?.matches));

const created = await expectStatus("send request", 201, "POST", "/match/requests", {
  token: a.token,
  body: { type: "PLAYER_TO_PLAYER", receiverId: b.id, game: LOL, message: "smoke" },
});
const requestId = created?.request?.id;
check("request stores game", created?.request?.game === LOL, JSON.stringify(created?.request?.game));

const counts = await expectStatus("receiver counts", 200, "GET", "/profiles/me/counts", { token: b.token });
check("receiver sees pending request", counts?.pendingRequests >= 1, JSON.stringify(counts));

await expectStatus("receiver accepts", 200, "PUT", `/match/requests/${requestId}/accept`, { token: b.token });
const inbox = await expectStatus("sender inbox", 200, "GET", "/conversations", { token: a.token });
const conversation = (inbox?.conversations ?? inbox?.data ?? inbox)?.find?.((item) => item.otherParticipant?.id === b.id);
check("conversation created on accept", Boolean(conversation), JSON.stringify(inbox)?.slice(0, 200));
await expectStatus("send message", 201, "POST", `/conversations/${conversation?.id}/messages`, { token: a.token, body: { content: "hello from smoke" } });

// Riot: Valorant needs RSO, LoL starts unlinked, the old existence-only verify route is gone.
const valorant = await call("GET", "/riot/stats?game=valorant", { token: a.token });
check("valorant stats require RSO", valorant.body?.status === "requires_rso", `${valorant.status} ${JSON.stringify(valorant.body)}`);
const lol = await expectStatus("lol stats", 200, "GET", `/riot/stats?game=${LOL}`, { token: a.token });
check("lol starts unlinked", lol?.status === "unlinked", JSON.stringify(lol?.status));
await expectStatus("lookup rejects malformed riot id", 400, "GET", `/riot/lookup?game=${LOL}&riotId=nohash`, { token: a.token });
await expectStatus("link rejects malformed riot id", 400, "POST", `/riot/link?game=${LOL}`, { token: a.token, body: { riotId: "nohash" } });
await expectStatus("verify needs a linked account", 400, "POST", `/riot/verify/start?game=${LOL}`, { token: a.token });
await expectStatus("unlink works when nothing is linked", 200, "DELETE", `/riot/link?game=${LOL}`, { token: a.token });
// Questionnaire: unknown answers are rejected; the age range never reaches other players.
const onboardingBody = { game: LOL, rankTier: "Gold", rankLevel: 2, role: "mid", schedule: ["weekend"], goals: ["rank_climb"], communicationStyles: ["chill"] };
await expectStatus("questionnaire rejects unknown answer", 400, "POST", "/profiles/onboarding", {
  token: b.token,
  body: { ...onboardingBody, questionnaire: { voiceChat: "shouting" } },
});
await expectStatus("questionnaire saved", 201, "POST", "/profiles/onboarding", {
  token: b.token,
  body: { ...onboardingBody, questionnaire: { voiceChat: "always", ageRange: "18_21", campus: "hcm" } },
});
const publicB = await expectStatus("public profile", 200, "GET", `/profiles/${b.id}`, { token: a.token });
check("public profile hides age range", publicB?.user?.campus === "hcm" && !("ageRange" in (publicB?.user ?? {})), JSON.stringify(publicB?.user));
await expectStatus("old verify route removed", 404, "POST", `/profiles/riot/verify?game=${LOL}`, { token: a.token });
const updated = await expectStatus("set riot id", 200, "PUT", "/profiles/me", { token: a.token, body: { game: LOL, riotId: "SmokeTest#VN2" } });
check("new riot id is self-reported", updated?.profile?.verificationStatus === "SELF_REPORTED", JSON.stringify(updated?.profile?.verificationStatus));

// Offline tournament: venue approval, registration, QR check-in, seeding, captain reports and host override.
const admin = await expectStatus("admin login", 201, "POST", "/auth/login", { body: { email: adminEmail, password } });
const host = await createPlayer("host");
const captains = [];
for (const tag of ["c", "d", "e", "f"]) captains.push(await createPlayer(tag));
const tournamentBody = {
  title: "Smoke Cup",
  game: LOL,
  format: "SINGLE_ELIMINATION",
  teamSize: 1,
  maxTeams: 4,
  bestOf: 1,
  finalBestOf: 3,
  entryFee: 50000,
  startsAt: new Date(Date.now() + 86_400_000).toISOString(),
};
await expectStatus("unapproved user cannot host", 403, "POST", "/offline-tournaments", { token: host.token, body: tournamentBody });
const venue = await expectStatus("apply as venue", 201, "POST", "/venues", {
  token: host.token,
  body: { name: "Smoke Cyber", address: "1 Smoke Street", city: "Hanoi", pcCount: 40 },
});
await expectStatus("player cannot review venues", 403, "PUT", `/admin/venues/${venue?.id}/review`, { token: host.token, body: { status: "APPROVED" } });
await expectStatus("admin approves venue", 200, "PUT", `/admin/venues/${venue?.id}/review`, { token: admin?.accessToken, body: { status: "APPROVED" } });
const cup = await expectStatus("create tournament", 201, "POST", "/offline-tournaments", { token: host.token, body: tournamentBody });
const cupPath = `/offline-tournaments/${cup?.id}`;

for (const [index, captain] of captains.entries()) {
  const team = await expectStatus(`team ${index + 1}`, 201, "POST", "/teams", {
    token: captain.token,
    body: { name: `Smoke Team ${index + 1} ${Date.now() % 10000}`, game: LOL, rankMin: "Silver", rankMax: "Platinum", neededRoles: ["top"], schedule: ["weekend"], goals: ["rank_climb"], communicationStyle: "chill" },
  });
  captain.teamId = team?.team?.id ?? team?.id;
}
await expectStatus("roster must be team members", 400, "POST", `${cupPath}/entries`, {
  token: captains[0].token,
  body: { teamId: captains[0].teamId, playerIds: [captains[1].id] },
});
for (const [index, captain] of captains.entries()) {
  await expectStatus(`register team ${index + 1}`, 201, "POST", `${cupPath}/entries`, { token: captain.token, body: { teamId: captain.teamId, playerIds: [captain.id] } });
}
await expectStatus("start needs check-in", 409, "POST", `${cupPath}/start`, { token: host.token });
await expectStatus("open check-in", 201, "POST", `${cupPath}/status`, { token: host.token, body: { status: "CHECK_IN" } });

const codes = [];
for (const captain of captains) codes.push((await call("GET", cupPath, { token: captain.token })).body?.myCheckIn?.code);
check("players get check-in codes", codes.every(Boolean), JSON.stringify(codes));
await expectStatus("only the host can scan", 404, "POST", "/offline-tournaments/check-in", { token: captains[1].token, body: { code: codes[0] } });
for (const code of codes.slice(0, 3)) {
  const scan = await expectStatus("host scans code", 201, "POST", "/offline-tournaments/check-in", { token: host.token, body: { code } });
  check("team checked in after scan", scan?.teamCheckedIn === true, JSON.stringify(scan));
}
const hostView = (await call("GET", cupPath, { token: host.token })).body;
const lastEntry = hostView?.entries?.find((entry) => entry.captainId === captains[3].id);
await expectStatus("host marks paid and checks in by hand", 200, "PUT", `${cupPath}/entries/${lastEntry?.id}`, { token: host.token, body: { paid: true, checkedIn: true } });
const otherView = (await call("GET", cupPath, { token: captains[0].token })).body;
check("payment hidden from other captains", otherView?.entries?.find((entry) => entry.id === lastEntry?.id)?.paid === null);

const matches = await expectStatus("start bracket", 201, "POST", `${cupPath}/start`, { token: host.token });
check("single elimination plans N-1 matches", matches?.length === captains.length - 1, JSON.stringify(matches?.length));
const tokenOf = (entryId) => captains.find((captain) => hostView.entries.find((entry) => entry.id === entryId)?.captainId === captain.id)?.token;
const [first, second] = matches?.filter((match) => match.status === "READY") ?? [];
await expectStatus("score must decide the match", 400, "POST", `/offline-tournaments/matches/${first?.id}/report`, { token: tokenOf(first?.entryAId), body: { scoreA: 1, scoreB: 1 } });
await expectStatus("outsider cannot report", 403, "POST", `/offline-tournaments/matches/${first?.id}/report`, { token: host.token, body: { scoreA: 1, scoreB: 0 } });
await expectStatus("captain A reports", 201, "POST", `/offline-tournaments/matches/${first?.id}/report`, { token: tokenOf(first?.entryAId), body: { scoreA: 1, scoreB: 0 } });
// Reports stay private until both are in: the opponent only learns one exists, outsiders see nothing.
const opponentView = (await call("GET", cupPath, { token: tokenOf(first?.entryBId) })).body?.matches?.find((m) => m.id === first?.id);
check("opponent can't read the first report", opponentView?.opponentReported === true && !opponentView?.reports?.A, JSON.stringify(opponentView?.reports));
const outsiderToken = captains.find((c) => ![tokenOf(first?.entryAId), tokenOf(first?.entryBId)].includes(c.token))?.token;
const outsiderView = (await call("GET", cupPath, { token: outsiderToken })).body?.matches?.find((m) => m.id === first?.id);
check("other players see no reports", outsiderView && outsiderView.reports === undefined, JSON.stringify(outsiderView?.reports));
const disputed = await expectStatus("captain B disagrees", 201, "POST", `/offline-tournaments/matches/${first?.id}/report`, { token: tokenOf(first?.entryBId), body: { scoreA: 0, scoreB: 1 } });
check("mismatched reports are disputed", disputed?.status === "DISPUTED", JSON.stringify(disputed?.status));
await expectStatus("host settles dispute", 201, "POST", `/offline-tournaments/matches/${first?.id}/result`, { token: host.token, body: { scoreA: 1, scoreB: 0 } });
await expectStatus("captain A reports match 2", 201, "POST", `/offline-tournaments/matches/${second?.id}/report`, { token: tokenOf(second?.entryAId), body: { scoreA: 0, scoreB: 1 } });
const agreed = await expectStatus("captain B confirms match 2", 201, "POST", `/offline-tournaments/matches/${second?.id}/report`, { token: tokenOf(second?.entryBId), body: { scoreA: 0, scoreB: 1 } });
check("matching reports settle the match", agreed?.status === "DONE" && agreed?.winnerEntryId === second?.entryBId, JSON.stringify(agreed));

const tv = await expectStatus("public bracket without sign-in", 200, "GET", `/public/offline-tournaments/${cup?.id}/bracket`);
// A whole cafe shares one IP: the TV and every player polling the bracket must not hit the rate limit.
const polls = await Promise.all(Array.from({ length: 120 }, () => call("GET", `/public/offline-tournaments/${cup?.id}/bracket`)));
check("bracket polling is not rate limited", polls.every((poll) => poll.status === 200), JSON.stringify([...new Set(polls.map((poll) => poll.status))]));
const final = tv?.matches?.find((match) => match.nextMatchKey === null);
check("winners reach the final", final?.status === "READY" && final?.bestOf === 3, JSON.stringify(final));
check("public bracket has no player data", !JSON.stringify(tv).includes(captains[0].email) && tv?.entries?.every((entry) => !("players" in entry)));
await expectStatus("final needs 2 wins", 400, "POST", `/offline-tournaments/matches/${final?.id}/result`, { token: host.token, body: { scoreA: 1, scoreB: 0 } });
await expectStatus("host enters final", 201, "POST", `/offline-tournaments/matches/${final?.id}/result`, { token: host.token, body: { scoreA: 2, scoreB: 1 } });
const done = (await call("GET", `/public/offline-tournaments/${cup?.id}/bracket`)).body;
check("champion is crowned", done?.status === "COMPLETED" && done?.championEntryId === final?.entryAId, JSON.stringify({ status: done?.status, champion: done?.championEntryId }));

// Double elimination: the host plays every ready match until a champion; losers must drop into the losers bracket.
const deCup = await expectStatus("create double elimination", 201, "POST", "/offline-tournaments", { token: host.token, body: { ...tournamentBody, title: "Smoke DE", format: "DOUBLE_ELIMINATION" } });
const dePath = `/offline-tournaments/${deCup?.id}`;
for (const captain of captains) await call("POST", `${dePath}/entries`, { token: captain.token, body: { teamId: captain.teamId, playerIds: [captain.id] } });
await call("POST", `${dePath}/status`, { token: host.token, body: { status: "CHECK_IN" } });
for (const entry of (await call("GET", dePath, { token: host.token })).body?.entries ?? []) {
  await call("PUT", `${dePath}/entries/${entry.id}`, { token: host.token, body: { checkedIn: true } });
}
const deMatches = await expectStatus("start double elimination", 201, "POST", `${dePath}/start`, { token: host.token });
check("double elimination plans 2N-2 matches", deMatches?.length === 2 * captains.length - 2, JSON.stringify(deMatches?.length));
let deState = (await call("GET", dePath, { token: host.token })).body;
for (let guard = 0; deState?.tournament?.status === "LIVE" && guard < 10; guard++) {
  for (const match of deState.matches.filter((m) => m.status === "READY")) {
    const wins = Math.ceil(match.bestOf / 2);
    await call("POST", `/offline-tournaments/matches/${match.id}/result`, { token: host.token, body: { scoreA: wins, scoreB: 0 } });
  }
  deState = (await call("GET", dePath, { token: host.token })).body;
}
check("double elimination finishes", deState?.tournament?.status === "COMPLETED" && deState.matches.every((m) => m.status === "DONE"), JSON.stringify(deState?.matches?.map((m) => `${m.key}:${m.status}`)));
check("losers bracket is played", deState?.matches?.some((m) => m.bracket === "LOSERS" && m.winnerEntryId), "");
check("grand final uses the final format", deState?.matches?.find((m) => m.bracket === "GRAND_FINAL")?.bestOf === 3);

// Coaching: a new listing stays hidden and unbookable until an admin approves it.
const coachBody = { game: LOL, specialties: ["Macro"], hourlyRate: 100000, bio: "Smoke coach listing for review checks.", availability: ["Weekend"] };
const pendingCoach = (await expectStatus("coach listing created", 201, "POST", "/coaching/coaches/me", { token: captains[0].token, body: coachBody }))?.coach;
check("new coach listing is pending", pendingCoach?.reviewStatus === "PENDING", JSON.stringify(pendingCoach?.reviewStatus));
const listedBefore = (await call("GET", `/coaching/coaches?game=${LOL}`, { token: captains[1].token })).body?.coaches ?? [];
check("pending coach is not listed", !listedBefore.some((coach) => coach.id === pendingCoach?.id));
const booking = { coachId: pendingCoach?.id, proposedStartAt: new Date(Date.now() + 2 * 86_400_000).toISOString(), durationMinutes: 60, proposedPrice: 100000, message: "smoke" };
await expectStatus("pending coach can't be booked", 404, "POST", "/coaching/requests", { token: captains[1].token, body: booking });
await expectStatus("player cannot review coaches", 403, "PUT", `/admin/coaches/${pendingCoach?.id}/review`, { token: captains[1].token, body: { status: "APPROVED" } });
await expectStatus("admin approves coach", 200, "PUT", `/admin/coaches/${pendingCoach?.id}/review`, { token: admin?.accessToken, body: { status: "APPROVED" } });
const listedAfter = (await call("GET", `/coaching/coaches?game=${LOL}`, { token: captains[1].token })).body?.coaches ?? [];
check("approved coach is listed", listedAfter.some((coach) => coach.id === pendingCoach?.id));

// Team room: the team chat follows the roster.
const roomTeam = captains[0].teamId;
const roomChat = (await call("GET", `/teams/${roomTeam}`, { token: captains[0].token })).body?.team?.conversationId;
check("captain gets the team room chat", typeof roomChat === "string");
check("outsider gets no room chat", (await call("GET", `/teams/${roomTeam}`, { token: host.token })).body?.team?.conversationId === null);
await expectStatus("outsider cannot read the room", 403, "GET", `/conversations/${roomChat}`, { token: host.token });
const application = await expectStatus("apply to team", 201, "POST", "/match/requests", {
  token: host.token,
  body: { type: "PLAYER_TO_TEAM", teamId: roomTeam, game: LOL, message: "smoke" },
});
await expectStatus("captain accepts application", 200, "PUT", `/match/requests/${application?.request?.id}/accept`, { token: captains[0].token });
await expectStatus("new member posts in the room", 201, "POST", `/conversations/${roomChat}/messages`, { token: host.token, body: { content: "gg team" } });
const roomHead = (await call("GET", `/conversations/${roomChat}`, { token: captains[0].token })).body?.conversation;
check("room head names the team and its members", roomHead?.team?.id === roomTeam && roomHead?.team?.members?.length === 2 && roomHead?.otherParticipant === null);
const captainInbox = (await call("GET", "/conversations", { token: captains[0].token })).body?.conversations ?? [];
check("room shows in the inbox", captainInbox.some((item) => item.id === roomChat && item.team?.id === roomTeam));
await expectStatus("member leaves team", 201, "POST", `/teams/${roomTeam}/leave`, { token: host.token });
await expectStatus("former member cannot read the room", 403, "GET", `/conversations/${roomChat}`, { token: host.token });
await expectStatus("former member cannot post", 403, "POST", `/conversations/${roomChat}/messages`, { token: host.token, body: { content: "still here?" } });

// Pictures: re-encoded on upload, served publicly, changeable only by the owner, removable by admins.
const avatar = await upload("PUT", "/media/avatar", { token: captains[1].token, file: PNG });
check("avatar upload", avatar.status === 200 && /\.webp$/.test(avatar.body?.avatarKey ?? ""), `${avatar.status} ${JSON.stringify(avatar.body)}`);
const avatarKey = avatar.body?.avatarKey;
const served = await fetch(`${apiUrl}/media/files/${avatarKey}`);
check(
  "avatar served as immutable webp",
  served.status === 200 && served.headers.get("content-type") === "image/webp" && served.headers.get("cache-control")?.includes("immutable") && served.headers.get("x-content-type-options") === "nosniff",
  `${served.status} ${served.headers.get("content-type")}`,
);
const profileWithAvatar = (await call("GET", `/profiles/${captains[1].id}`, { token: captains[0].token })).body;
check("public profile carries the avatar", profileWithAvatar?.user?.avatarKey === avatarKey && Array.isArray(profileWithAvatar?.achievements));
const svg = await upload("PUT", "/media/avatar", { token: captains[1].token, file: { bytes: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), type: "image/svg+xml", name: "x.svg" } });
check("svg upload rejected", svg.status === 400, `${svg.status}`);
const noFile = await upload("PUT", "/media/avatar", { token: captains[1].token });
check("upload without a file rejected", noFile.status === 400, `${noFile.status}`);
const anonymous = await upload("PUT", "/media/avatar", { file: PNG });
check("anonymous upload rejected", anonymous.status === 401, `${anonymous.status}`);
const traversal = await fetch(`${apiUrl}/media/files/..%2F..%2Fpackage.json`);
check("file route refuses anything but a media key", traversal.status === 404, `${traversal.status}`);
const replaced = await upload("PUT", "/media/avatar", { token: captains[1].token, file: PNG });
const oldFile = await fetch(`${apiUrl}/media/files/${avatarKey}`);
check("replacing the avatar deletes the old file", replaced.status === 200 && replaced.body?.avatarKey !== avatarKey && oldFile.status === 404, `${oldFile.status}`);

const logoTeam = captains[0].teamId;
const logo = await upload("PUT", `/media/teams/${logoTeam}/logo`, { token: captains[0].token, file: PNG });
check("captain uploads the team logo", logo.status === 200 && Boolean(logo.body?.logoKey), `${logo.status}`);
const strangerLogo = await upload("PUT", `/media/teams/${logoTeam}/logo`, { token: captains[1].token, file: PNG });
check("non-captain cannot change the logo", strangerLogo.status === 403, `${strangerLogo.status}`);
const teamWithLogo = (await call("GET", `/teams/${logoTeam}`, { token: captains[1].token })).body?.team;
check("team detail carries the logo", teamWithLogo?.logoKey === logo.body?.logoKey);

const achievement = await upload("POST", "/media/achievements", { token: captains[0].token, file: PNG, fields: { owner: "team", teamId: logoTeam, title: "Smoke Cup champion" } });
check("captain adds a team achievement", achievement.status === 201 && achievement.body?.achievement?.title === "Smoke Cup champion", `${achievement.status} ${JSON.stringify(achievement.body)}`);
const strangerAchievement = await upload("POST", "/media/achievements", { token: captains[1].token, file: PNG, fields: { owner: "team", teamId: logoTeam, title: "Not mine" } });
check("non-captain cannot add team achievements", strangerAchievement.status === 403, `${strangerAchievement.status}`);
const badTitle = await upload("POST", "/media/achievements", { token: captains[0].token, file: PNG, fields: { owner: "user", title: "x" } });
check("achievement title is validated", badTitle.status === 400, `${badTitle.status}`);
const coachAchievement = await upload("POST", "/media/achievements", { token: captains[0].token, file: PNG, fields: { owner: "coach", title: "Coached a Diamond team" } });
check("coach adds an achievement", coachAchievement.status === 201, `${coachAchievement.status}`);
const coachView = (await call("GET", `/coaching/coaches/${pendingCoach?.id}`, { token: captains[1].token })).body;
check("coach page lists achievements", coachView?.achievements?.some((item) => item.id === coachAchievement.body?.achievement?.id));
const teamAchievements = (await call("GET", `/teams/${logoTeam}`, { token: captains[1].token })).body?.team?.achievements ?? [];
check("team page lists achievements", teamAchievements.some((item) => item.id === achievement.body?.achievement?.id));
const achievementId = achievement.body?.achievement?.id;
await expectStatus("stranger cannot remove the achievement", 403, "DELETE", `/media/achievements/${achievementId}`, { token: captains[1].token });
const userAchievements = [];
for (let index = 0; index < 7; index += 1) {
  userAchievements.push((await upload("POST", "/media/achievements", { token: captains[1].token, file: PNG, fields: { owner: "user", title: `Trophy ${index}` } })).status);
}
check("achievement gallery caps at 6", userAchievements.slice(0, 6).every((status) => status === 201) && userAchievements[6] === 409, JSON.stringify(userAchievements));
await expectStatus("admin removes the achievement", 200, "DELETE", `/admin/media/achievements/${achievementId}`, { token: admin?.accessToken });
await expectStatus("admin removes the team logo", 200, "DELETE", `/admin/media/teams/${logoTeam}/logo`, { token: admin?.accessToken });
await expectStatus("admin removes an avatar", 200, "DELETE", `/admin/media/users/${captains[1].id}/avatar`, { token: admin?.accessToken });
await expectStatus("player cannot use admin media api", 403, "DELETE", `/admin/media/users/${captains[0].id}/avatar`, { token: captains[1].token });
const removedLogo = (await call("GET", `/teams/${logoTeam}`, { token: captains[0].token })).body?.team?.logoKey;
check("logo is gone after moderation", removedLogo === null);
const shortLived = await createPlayer("pics");
const doomed = (await expectStatus("team to delete", 201, "POST", "/teams", {
  token: shortLived.token,
  body: { name: `Doomed ${Date.now() % 10000}`, game: LOL, rankMin: "Silver", rankMax: "Platinum", neededRoles: ["top"], schedule: ["weekend"], goals: ["rank_climb"], communicationStyle: "chill" },
}))?.team;
const doomedLogo = (await upload("PUT", `/media/teams/${doomed?.id}/logo`, { token: shortLived.token, file: PNG })).body?.logoKey;
await expectStatus("captain deletes the team", 200, "DELETE", `/teams/${doomed?.id}`, { token: shortLived.token });
check("deleting a team deletes its logo file", Boolean(doomedLogo) && (await fetch(`${apiUrl}/media/files/${doomedLogo}`)).status === 404);

// Credits: mock top-up, spends, admin adjustments. Run the API with PAYMENT_PROVIDER=mock.
const buyer = captains[1];
const coachUser = captains[0];
const balanceOf = async (player) => (await call("GET", "/credits/me", { token: player.token })).body?.balance;
const wallet = await expectStatus("wallet", 200, "GET", "/credits/me", { token: buyer.token });
check("wallet starts empty on the mock provider", wallet?.balance === 0 && wallet?.provider === "mock", JSON.stringify({ balance: wallet?.balance, provider: wallet?.provider }));
await expectStatus("top-up below the minimum is refused", 400, "POST", "/credits/topups", { token: buyer.token, body: { credits: 7 } });
const order = (await expectStatus("create top-up", 201, "POST", "/credits/topups", { token: buyer.token, body: { credits: 50 } }))?.topUp;
check("top-up is priced by the server", order?.amountVnd === 50000 && order?.status === "PENDING", JSON.stringify(order));
await expectStatus("someone else can't pay my order", 404, "POST", `/credits/topups/${order?.orderCode}/mock-pay`, { token: coachUser.token });
await expectStatus("mock pay", 201, "POST", `/credits/topups/${order?.orderCode}/mock-pay`, { token: buyer.token });
await call("POST", `/credits/topups/${order?.orderCode}/mock-pay`, { token: buyer.token });
check("paying twice credits once", (await balanceOf(buyer)) === 50);
const gifted = await expectStatus("cosmetics after the first top-up", 200, "GET", "/cosmetics/me", { token: buyer.token });
check("first top-up gives the Solara pet and equips it", gifted?.owned?.includes("pet_solara") && gifted?.equipped?.pet === "pet_solara", JSON.stringify(gifted?.equipped));

// Daily check-in: locked reward credits once per Vietnam day.
const visitor = await createPlayer("checkin");
const firstVisit = await expectStatus("daily check-in", 201, "POST", "/credits/check-in", { token: visitor.token });
check("first check-in gives day 1 credits", firstVisit?.claimed === true && firstVisit?.streak === 1 && firstVisit?.reward === firstVisit?.rules?.daily, JSON.stringify(firstVisit));
const againVisit = await expectStatus("second check-in today", 201, "POST", "/credits/check-in", { token: visitor.token });
const visitorWallet = (await call("GET", "/credits/me", { token: visitor.token })).body;
check("checking in twice a day credits once, as locked credits", againVisit?.claimed === false && visitorWallet?.balance === firstVisit?.rules?.daily && visitorWallet?.locked === firstVisit?.rules?.daily, JSON.stringify({ againVisit, balance: visitorWallet?.balance, locked: visitorWallet?.locked }));
const dropped = (await expectStatus("second top-up", 201, "POST", "/credits/topups", { token: buyer.token, body: { credits: 20 } }))?.topUp;
const cancelled = (await expectStatus("cancel top-up", 201, "POST", `/credits/topups/${dropped?.orderCode}/mock-cancel`, { token: buyer.token }))?.topUp;
check("cancelled top-up adds nothing", cancelled?.status === "CANCELLED" && (await balanceOf(buyer)) === 50);
const forged = await call("POST", "/payments/payos/webhook", { body: { code: "00", data: { orderCode: dropped?.orderCode, amount: 20000, code: "00" }, signature: "0".repeat(64) } });
check("forged webhook is ignored", forged.status === 200 && forged.body?.success === false && (await balanceOf(buyer)) === 50, JSON.stringify(forged));

const broke = await createPlayer("broke");
await expectStatus("boost without credits", 409, "POST", "/credits/promotions/boost", { token: broke.token, body: { game: LOL } });
const boosted = await expectStatus("boost profile", 201, "POST", "/credits/promotions/boost", { token: buyer.token, body: { game: LOL } });
check("boost costs 20", boosted?.balance === 30 && Boolean(boosted?.boostedUntil), JSON.stringify(boosted));
const boostedMatches = (await call("POST", "/match/find", { token: broke.token, body: { mode: "find_players", game: LOL } })).body?.matches ?? [];
check("boosted player is flagged in Find Match", boostedMatches.find((match) => match.id === buyer.id)?.boosted === true);
const featureTeam = coachUser.teamId;
await expectStatus("non-captain can't feature a team", 403, "POST", `/credits/promotions/teams/${featureTeam}/feature`, { token: buyer.token });
await expectStatus("feature without credits", 409, "POST", `/credits/promotions/teams/${featureTeam}/feature`, { token: coachUser.token });
await expectStatus("player can't adjust credits", 403, "POST", "/admin/credits/adjust", { token: buyer.token, body: { userId: buyer.id, amount: 1000, note: "free money" } });
await expectStatus("admin adjusts a balance", 201, "POST", "/admin/credits/adjust", { token: admin?.accessToken, body: { userId: coachUser.id, amount: 40, note: "smoke grant" } });
const featured = await expectStatus("feature team", 201, "POST", `/credits/promotions/teams/${featureTeam}/feature`, { token: coachUser.token });
check("feature costs 30", featured?.balance === 10, JSON.stringify(featured));
const teamList = (await call("GET", `/teams?game=${LOL}`, { token: broke.token })).body;
const teamRows = teamList?.teams ?? teamList?.data ?? teamList ?? [];
const featuredAt = teamRows.findIndex?.((team) => team.id === featureTeam);
const firstPlain = teamRows.findIndex?.((team) => !team.featuredUntil);
check("featured team is listed ahead of the rest", featuredAt >= 0 && Boolean(teamRows[featuredAt]?.featuredUntil) && (firstPlain === -1 || featuredAt < firstPlain), JSON.stringify({ featuredAt, firstPlain }));
const ledger = (await expectStatus("admin ledger", 200, "GET", `/admin/credits?userId=${coachUser.id}`, { token: admin?.accessToken }))?.transactions ?? [];
check("ledger records the grant and the spend", ledger.map((row) => row.kind).join() === "FEATURE,ADJUSTMENT", JSON.stringify(ledger.map((row) => row.kind)));

// Coaching in credits (CREDITS_COACHING=true): held on agree, refunded on cancel, released on confirm, disputes go to admins.
const soon = (seconds) => new Date(Date.now() + seconds * 1000).toISOString();
const book = async (name, startAt) =>
  (await expectStatus(name, 201, "POST", "/coaching/requests", { token: buyer.token, body: { ...booking, proposedStartAt: startAt, proposedPrice: 100000 } }))?.request;
const tooPricey = await book("book a 100-credit session", soon(3600));
await expectStatus("coach can't agree while the player is short", 409, "PUT", `/coaching/requests/${tooPricey?.id}/agree`, { token: coachUser.token });
await expectStatus("admin tops the player up", 201, "POST", "/admin/credits/adjust", { token: admin?.accessToken, body: { userId: buyer.id, amount: 200, note: "smoke coaching" } });
const held = (await expectStatus("coach agrees", 200, "PUT", `/coaching/requests/${tooPricey?.id}/agree`, { token: coachUser.token }))?.request;
check("agreeing holds the price", held?.settlement === "HELD" && held?.creditHold === 100 && (await balanceOf(buyer)) === 130, JSON.stringify({ settlement: held?.settlement, hold: held?.creditHold }));
const refunded = (await expectStatus("player cancels", 200, "PUT", `/coaching/requests/${tooPricey?.id}/cancel`, { token: buyer.token }))?.request;
check("cancelling refunds the hold", refunded?.settlement === "REFUNDED" && (await balanceOf(buyer)) === 230);
const startsAt = soon(12);
const kept = await book("book a session that goes well", startsAt);
await expectStatus("coach agrees to it", 200, "PUT", `/coaching/requests/${kept?.id}/agree`, { token: coachUser.token });
const contested = await book("book a session that goes wrong", startsAt);
await expectStatus("coach agrees to that too", 200, "PUT", `/coaching/requests/${contested?.id}/agree`, { token: coachUser.token });
check("both sessions are held", (await balanceOf(buyer)) === 30);
await expectStatus("can't confirm before it starts", 400, "PUT", `/coaching/requests/${kept?.id}/confirm`, { token: buyer.token });
await new Promise((resolve) => setTimeout(resolve, Math.max(0, new Date(startsAt).getTime() - Date.now()) + 1500));
await expectStatus("coach can't confirm for the player", 404, "PUT", `/coaching/requests/${kept?.id}/confirm`, { token: coachUser.token });
const released = (await expectStatus("player confirms", 200, "PUT", `/coaching/requests/${kept?.id}/confirm`, { token: buyer.token }))?.request;
check("confirming pays the coach", released?.settlement === "RELEASED", JSON.stringify(released?.settlement));
await expectStatus("confirming twice fails", 400, "PUT", `/coaching/requests/${kept?.id}/confirm`, { token: buyer.token });
const disputed2 = (await expectStatus("player reports a problem", 200, "PUT", `/coaching/requests/${contested?.id}/dispute`, { token: buyer.token }))?.request;
check("report freezes the hold", disputed2?.settlement === "DISPUTED");
let payments = await expectStatus("admin coaching payments", 200, "GET", "/admin/coaching/payments", { token: admin?.accessToken });
const payable = payments?.coaches?.find((coach) => coach.id === pendingCoach?.id)?.payableCredits;
check("coach is owed the released session", payable === 100, JSON.stringify(payable));
check("dispute waits for an admin", payments?.disputes?.some((item) => item.id === contested?.id));
await expectStatus("player can't resolve disputes", 403, "POST", `/admin/coaching/requests/${contested?.id}/resolve`, { token: buyer.token, body: { outcome: "release" } });
await expectStatus("admin refunds the dispute", 201, "POST", `/admin/coaching/requests/${contested?.id}/resolve`, { token: admin?.accessToken, body: { outcome: "refund" } });
check("refunded dispute returns the credits", (await balanceOf(buyer)) === 130);
await expectStatus("payout can't exceed what is owed", 409, "POST", `/admin/coaching/coaches/${pendingCoach?.id}/payouts`, { token: admin?.accessToken, body: { amount: 101, note: "too much" } });
const paidOut = await expectStatus("admin records a payout", 201, "POST", `/admin/coaching/coaches/${pendingCoach?.id}/payouts`, { token: admin?.accessToken, body: { amount: 60, note: "bank transfer smoke" } });
check("payout lowers what is owed", paidOut?.payableCredits === 40, JSON.stringify(paidOut));
check("coach credits are not spendable", (await balanceOf(coachUser)) === 10);

// Cosmetics: bought once with credits, equipped on the public profile and Find Match cards.
const shop = await expectStatus("cosmetics shop", 200, "GET", "/cosmetics/me", { token: buyer.token });
const frame = shop?.catalog?.find((item) => item.kind === "frame");
const title = shop?.catalog?.find((item) => item.kind === "title");
const banner = shop?.catalog?.find((item) => item.kind === "banner");
const before = await balanceOf(buyer);
await expectStatus("broke player can't buy", 409, "POST", `/cosmetics/${frame?.id}/buy`, { token: broke.token });
await expectStatus("unknown item", 404, "POST", "/cosmetics/frame_nope/buy", { token: buyer.token });
const bought = await expectStatus("buy a frame", 201, "POST", `/cosmetics/${frame?.id}/buy`, { token: buyer.token });
check("buying equips it and charges once", bought?.equipped?.frame === frame?.id && bought?.owned?.includes(frame?.id) && bought?.balance === before - frame?.credits, JSON.stringify({ equipped: bought?.equipped, balance: bought?.balance }));
await expectStatus("can't buy the same item twice", 409, "POST", `/cosmetics/${frame?.id}/buy`, { token: buyer.token });
check("second buy charges nothing", (await balanceOf(buyer)) === before - frame?.credits);
await expectStatus("buy a title", 201, "POST", `/cosmetics/${title?.id}/buy`, { token: buyer.token });
await expectStatus("can't equip what you don't own", 403, "PUT", "/cosmetics/equipped", { token: buyer.token, body: { kind: "banner", itemId: banner?.id } });
await expectStatus("can't equip into the wrong slot", 400, "PUT", "/cosmetics/equipped", { token: buyer.token, body: { kind: "banner", itemId: frame?.id } });
const seen = (await call("GET", `/profiles/${buyer.id}`, { token: broke.token })).body?.user?.cosmetics;
check("public profile shows equipped cosmetics", seen?.frame === frame?.id && seen?.title === title?.id && seen?.banner === null, JSON.stringify(seen));
const card = ((await call("POST", "/match/find", { token: broke.token, body: { mode: "find_players", game: LOL } })).body?.matches ?? []).find((match) => match.id === buyer.id);
check("Find Match card shows the frame", card?.cosmetics?.frame === frame?.id, JSON.stringify(card?.cosmetics));
const unequipped = await expectStatus("take the frame off", 200, "PUT", "/cosmetics/equipped", { token: buyer.token, body: { kind: "frame", itemId: null } });
check("unequipped item stays owned", unequipped?.equipped?.frame === null && unequipped?.owned?.includes(frame?.id));

// Build guides: public list, premium pass bought with credits.
await expectStatus("guides list", 200, "GET", "/guides", { token: broke.token });
await expectStatus("guides reject an unknown position", 400, "GET", "/guides?position=feeder", { token: broke.token });
await expectStatus("missing guide", 404, "GET", "/guides/NotAChampion/mid", { token: broke.token });
const passBefore = await expectStatus("premium status", 200, "GET", "/guides/premium", { token: buyer.token });
check("no premium yet", passBefore?.premiumUntil === null && passBefore?.price?.credits > 0, JSON.stringify(passBefore));
await expectStatus("premium without credits", 409, "POST", "/guides/premium", { token: broke.token });
const walletBeforePass = await balanceOf(buyer);
const pass = await expectStatus("buy premium", 201, "POST", "/guides/premium", { token: buyer.token });
check("premium costs the pass price and lasts 30 days", pass?.balance === walletBeforePass - passBefore?.price?.credits && Math.round((new Date(pass?.premiumUntil) - Date.now()) / 86_400_000) === 30, JSON.stringify(pass));
check("premium shows as active", (await call("GET", "/guides/premium", { token: buyer.token })).body?.premiumUntil === pass?.premiumUntil);

// Safety: restricted users can't start contact, banned users are locked out.
await expectStatus("player cannot use admin api", 403, "GET", "/admin/metrics", { token: a.token });
await expectStatus("restrict a", 200, "PUT", `/admin/users/${a.id}/status`, { token: admin?.accessToken, body: { status: "RESTRICTED", note: "smoke" } });
await expectStatus("restricted cannot send request", 403, "POST", "/match/requests", {
  token: a.token,
  body: { type: "PLAYER_TO_PLAYER", receiverId: b.id, game: LOL },
});
await expectStatus("restricted cannot message", 403, "POST", `/conversations/${conversation?.id}/messages`, { token: a.token, body: { content: "blocked" } });

await expectStatus("ban b", 200, "PUT", `/admin/users/${b.id}/status`, { token: admin?.accessToken, body: { status: "BANNED", note: "smoke" } });
await expectStatus("banned token rejected", 401, "GET", "/profiles/me/counts", { token: b.token });
await expectStatus("banned login rejected", 403, "POST", "/auth/login", { body: { email: b.email, password } });
const afterBan = (await call("POST", "/match/find", { token: host.token, body: { mode: "find_players", game: LOL } })).body?.matches ?? [];
check("banned player is not suggested", !afterBan.some((match) => match.id === b.id));
await expectStatus("banned player can't receive requests", 404, "POST", "/match/requests", { token: host.token, body: { type: "PLAYER_TO_PLAYER", receiverId: b.id, game: LOL, message: "smoke" } });

// Public listings still work.
await expectStatus("teams list", 200, "GET", `/teams?game=${LOL}`, { token: a.token });
await expectStatus("events list", 200, "GET", "/tournaments");
await expectStatus("coaches list", 200, "GET", `/coaching/coaches?game=${LOL}`, { token: a.token });

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
await prisma.$disconnect();
process.exit(failures ? 1 : 0);
