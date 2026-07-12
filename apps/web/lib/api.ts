import {
  currentUser,
  mockConversations,
  mockEvents,
  mockMatchResults,
  mockMessages,
  mockPlayers,
  mockRequests,
  mockTeams,
  mockCoaches,
  mockCoachDetails,
} from "./mock-data";
import type {
  Conversation,
  MatchRequest,
  MatchResult,
  PlayerProfile,
  TeamProfile,
  TournamentEvent,
  ProfileView,
  FindMatchView,
  DashboardView,
  Coach,
  CoachDetail,
  CoachingRequest,
} from "./types";

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const API_URL = `${API_ORIGIN}/api/v1`;
const TOKEN_KEY = "fpt-esporthub-token";
const DEMO_EMAIL = "minh@fpt.edu.vn";
const DEMO_PASSWORD = "Password123!";

function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

function isDemoCredential(email: string, password: string) {
  return email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
}

function shouldUseDemoFallback() {
  return !process.env.NEXT_PUBLIC_API_URL && typeof window !== "undefined" && window.location.hostname !== "localhost";
}

export function logout() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

function handleUnauthorized() {
  logout();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("fpt-esporthub:session-expired"));
  }
}

async function publicFetch<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function apiFetch<T>(path: string, init: RequestInit = {}) {
  const token = getToken();
  if (!token) throw new Error("Missing auth token");

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (response.status === 401) {
    handleUnauthorized();
  }
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json() as Promise<T>;
}

function toGameId(game: string | undefined) {
  return game === "VALORANT" ? "valorant" : "league_of_legends";
}

function rankLabel(rankTier: string | undefined, rankLevel: number | null | undefined) {
  if (!rankTier) return "Unranked";
  return rankLevel ? `${rankTier} ${rankLevel}` : rankTier;
}

function mapProfile(payload: any): PlayerProfile {
  const profile = payload.profile ?? {};
  const user = payload.user ?? {};

  return {
    id: profile.id ?? currentUser.id,
    userId: user.id ?? profile.userId ?? currentUser.userId,
    displayName: user.displayName ?? currentUser.displayName,
    bio: profile.bio ?? currentUser.bio,
    avatarUrl: profile.avatarUrl ?? null,
    gameId: toGameId(profile.game),
    rankLabel: rankLabel(profile.rankTier, profile.rankLevel),
    roleLabel: profile.role ?? currentUser.roleLabel,
    schedule: Array.isArray(profile.schedule) ? profile.schedule.join(", ") : currentUser.schedule,
    goalIds: profile.goals ?? currentUser.goalIds,
    commStyleIds: profile.communicationStyles ?? currentUser.commStyleIds,
    lookingForTeam: profile.lookingStatus === "open_to_match" || currentUser.lookingForTeam,
    riotId: profile.riotId ?? null,
    verificationStatus: (profile.verificationStatus ?? "unverified").toLowerCase(),
    reputationBadge: profile.reputationBadge ? profile.reputationBadge[0] + profile.reputationBadge.slice(1).toLowerCase() : currentUser.reputationBadge,
    onboardingComplete: profile.onboardingComplete ?? currentUser.onboardingComplete,
  } as PlayerProfile;
}

function mapTeam(team: any): TeamProfile {
  return {
    id: team.id,
    name: team.name,
    tag: team.tag ?? team.name.slice(0, 3).toUpperCase(),
    description: team.description ?? "",
    gameId: toGameId(team.game),
    captainName: team.captain?.displayName ?? team.captainName ?? "Captain",
    memberCount: team._count?.members ?? team.memberCount ?? 1,
    neededRoles: team.neededRoles ?? [],
    rankRange: team.rankRange ?? `${team.rankMin ?? "Any"}-${team.rankMax ?? "Any"}`,
    schedule: Array.isArray(team.schedule) ? team.schedule.join(", ") : team.schedule ?? "Flexible",
    goalIds: team.goals ?? [],
    commStyleIds: team.communicationStyle ? [team.communicationStyle] : [],
    recruitmentOpen: team.recruitmentOpen ?? true,
    createdAt: team.createdAt ?? new Date().toISOString(),
  } as TeamProfile;
}

function mapMatch(match: any): MatchResult {
  if (match.type === "team") {
    return {
      id: match.id,
      type: "team",
      name: match.name,
      game: match.game === "VALORANT" ? "Valorant" : "League of Legends",
      rank: `${match.rankMin ?? "Any"}-${match.rankMax ?? "Any"}`,
      role: `Need: ${(match.neededRoles ?? []).join(", ") || "Flexible"}`,
      schedule: "See team profile",
      score: match.score,
      reasons: match.reasons ?? [],
      reputationBadge: "Team",
      verificationStatus: "Self-reported",
      bio: match.description ?? `${match.memberCount ?? 1}/5 thành viên · Captain ${match.captainName ?? "Squad lead"}`,
      avatarEmoji: "⚡",
    };
  }

  return {
    id: match.id,
    type: "player",
    name: match.displayName,
    game: match.game === "VALORANT" ? "Valorant" : "League of Legends",
    rank: rankLabel(match.rankTier, match.rankLevel),
    role: match.role,
    schedule: "See profile",
    score: match.score,
    reasons: match.reasons ?? [],
    reputationBadge: match.reputationBadge ? match.reputationBadge[0] + match.reputationBadge.slice(1).toLowerCase() : "New",
    verificationStatus: match.verificationStatus === "VERIFIED" ? "Verified" : "Self-reported",
    bio: match.bio ?? "Sẵn sàng ghép đội và luyện tập cùng squad phù hợp.",
    avatarEmoji: match.avatarEmoji ?? avatarForName(match.displayName ?? match.name),
    cautionMessage: match.reputationBadge === "CAUTION" ? "Tài khoản có lịch sử report, hãy thận trọng." : undefined,
  };
}

function avatarForName(name: string | undefined) {
  const avatars = ["🐉", "🌸", "🐺", "🦊", "⚡", "🎯"];
  const seed = (name ?? "player").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return avatars[seed % avatars.length];
}

function sentAtLabel(createdAt: string | undefined) {
  if (!createdAt) return "Vừa gửi";
  const elapsed = Date.now() - new Date(createdAt).getTime();
  const hours = Math.max(1, Math.round(elapsed / 36e5));
  return hours >= 24 ? `Đã gửi ${Math.round(hours / 24)} ngày trước` : `Đã gửi ${hours} giờ trước`;
}

function fallbackFindMatchView(mode: "players" | "teams"): FindMatchView {
  const matches = getFallbackMatches(mode);
  const pendingRequests = mockRequests
    .filter((request) => request.fromUserId === currentUser.id && request.status === "pending")
    .slice(0, 3)
    .map((request) => ({
      id: request.id,
      name: request.toName,
      avatarEmoji: avatarForName(request.toName),
      sentAtLabel: sentAtLabel(request.createdAt),
      statusLabel: "Chờ",
    }));

  return {
    profile: {
      game: currentUser.gameId === "valorant" ? "Valorant" : "League of Legends",
      rank: currentUser.rankLabel,
      role: currentUser.roleLabel,
      schedule: currentUser.schedule.split(",")[0]?.trim() ?? "Flexible",
      updatedLabel: "Cập nhật 5 phút trước",
    },
    stats: {
      totalSuggestions: matches.length,
      averageScore: matches.length ? Math.round(matches.reduce((sum, match) => sum + match.score, 0) / matches.length) : 0,
      pendingSent: pendingRequests.length,
      accepted: mockRequests.filter((request) => request.fromUserId === currentUser.id && request.status === "accepted").length,
    },
    matches,
    pendingRequests,
    tips: [
      { label: "Đã verify Email FPT (+10% score)", state: "done" },
      { label: currentUser.verificationStatus === "verified" ? "Đã verify Riot ID (+15% score)" : "Đang chờ verify Riot ID (+15% score)", state: currentUser.verificationStatus === "verified" ? "done" : "pending" },
      { label: "Cập nhật chi tiết lịch chơi (+5% score)", state: currentUser.schedule.includes(",") ? "done" : "todo" },
    ],
  };
}

function mapRequest(req: any): MatchRequest {
  return {
    id: req.id,
    fromUserId: req.senderId ?? req.fromUserId,
    fromName: req.sender?.displayName ?? req.fromUser?.displayName ?? req.fromName ?? "Player",
    toUserId: req.receiverId ?? req.teamId ?? req.toUserId ?? req.toTeamId ?? "",
    toName: req.receiver?.displayName ?? req.team?.name ?? req.toUser?.displayName ?? req.toTeam?.name ?? req.toName ?? "Target",
    type: req.type?.toLowerCase() ?? "player_to_player",
    status: req.status?.toLowerCase() ?? "pending",
    message: req.message ?? "",
    createdAt: req.createdAt,
  } as MatchRequest;
}

function mapConversation(conv: any): Conversation {
  const other = conv.participants?.find((p: any) => p.id !== currentUser.userId) ?? conv.participants?.[0];
  const lastMessage = conv.lastMessage;

  return {
    id: conv.id,
    otherUserName: other?.displayName ?? "Player",
    otherUserBadge: "Verified",
    lastMessage: lastMessage?.content ?? "No messages yet",
    lastMessageAt: lastMessage?.createdAt ?? conv.updatedAt,
    unread: false,
  };
}

function mapEvent(event: any): TournamentEvent {
  return {
    id: event.id,
    title: event.title,
    game: event.game === "VALORANT" ? "Valorant" : "League of Legends",
    date: event.startsAt ?? event.date,
    organizer: event.organizer ?? "FPT EsportHub",
    rules: event.rules ?? "Rules will be announced by organizer.",
    deadline: event.registrationDeadline ?? event.deadline ?? event.startsAt,
    interestedCount: event.interestedCount ?? event._count?.interests ?? 0,
    description: event.description ?? "",
  };
}

export async function getMyProfile() {
  try {
    return mapProfile(await apiFetch("/profiles/me"));
  } catch {
    return currentUser;
  }
}

function fallbackDashboardView(): DashboardView {
  const pendingReqs = mockRequests.filter((request) => request.status === "pending").length;
  return {
    displayName: currentUser.displayName,
    avatarEmoji: "🦊",
    activeGame: currentUser.gameId === "valorant" ? "val" : "lol",
    unreadMessages: 2,
    profiles: {
      lol: {
        bio: currentUser.gameId === "league_of_legends" ? currentUser.bio : "Mid main, kiểm soát bản đồ tốt. Thích try-hard ranked nhưng vẫn chill khi scrim.",
        rank: currentUser.gameId === "league_of_legends" ? currentUser.rankLabel : "Emerald II",
        role: currentUser.gameId === "league_of_legends" ? currentUser.roleLabel : "Mid",
        commStyle: "Shotcaller",
        playStyle: "Try-hard",
        goal: "Leo Rank",
        matchScore: 87,
        pendingReqs: currentUser.gameId === "league_of_legends" ? pendingReqs : 2,
        readiness: 90,
        pills: [{ text: "📈 Leo rank LoL", cls: "lol" }, { text: "🏆 Scrim LoL", cls: "goal" }],
        radar: {
          points: "100,32 162.3,64 155.4,132 100,148 48,130 41,66",
          coords: [{ cx: 100, cy: 32 }, { cx: 162.3, cy: 64 }, { cx: 155.4, cy: 132 }, { cx: 100, cy: 148 }, { cx: 48, cy: 130 }, { cx: 41, cy: 66 }],
          labels: [{ x: 100, y: 12, text: "Mechanics" }, { x: 180, y: 60, text: "Map Aware" }, { x: 180, y: 145, text: "Teamfight" }, { x: 100, y: 195, text: "Vision" }, { x: 20, y: 145, text: "Lane Phase" }, { x: 20, y: 60, text: "Shotcall" }],
        },
        matches: [
          { id: 1, map: "Summoner's Rift", score: "25/8/12", type: "Ranked", time: "2h ago", result: "Win", sub: "CS: 234" },
          { id: 2, map: "Summoner's Rift", score: "10/12/15", type: "Ranked", time: "5h ago", result: "Loss", sub: "CS: 180" },
          { id: 3, map: "Summoner's Rift", score: "18/4/8", type: "Scrim", time: "Hôm qua", result: "Win", sub: "CS: 210" },
        ],
        dailyMatches: [{ id: 1, avatar: "⚡", name: "LongGG", desc: "Emerald 1 · Jungle", score: 87 }, { id: 2, avatar: "🛡️", name: "QuanTop", desc: "Diamond 4 · Top", score: 82 }],
        pendingComms: { avatar: "🌸", name: "TrangKill", msg: "Scrim LoL tối nay không?" },
      },
      val: {
        bio: currentUser.gameId === "valorant" ? currentUser.bio : "Duelist chính hiệu, Jett one-trick. Thích scrim nghiêm túc nhưng không toxic.",
        rank: currentUser.gameId === "valorant" ? currentUser.rankLabel : "Diamond 2",
        role: currentUser.gameId === "valorant" ? currentUser.roleLabel : "Duelist",
        commStyle: "Shotcaller",
        playStyle: "Aggressive",
        goal: "Thi đấu giải",
        matchScore: 92,
        pendingReqs: currentUser.gameId === "valorant" ? pendingReqs : 1,
        readiness: 85,
        pills: [{ text: "📈 Scrim Valorant", cls: "val" }, { text: "🏆 Thi đấu giải", cls: "goal" }],
        radar: {
          points: "100,40 148.5,72 162.3,136 100,140 44.6,132 54.9,74",
          coords: [{ cx: 100, cy: 40 }, { cx: 148.5, cy: 72 }, { cx: 162.3, cy: 136 }, { cx: 100, cy: 140 }, { cx: 44.6, cy: 132 }, { cx: 54.9, cy: 74 }],
          labels: [{ x: 100, y: 12, text: "Aim" }, { x: 180, y: 60, text: "Game Sense" }, { x: 180, y: 145, text: "Comms" }, { x: 100, y: 195, text: "Support" }, { x: 20, y: 145, text: "Clutch" }, { x: 20, y: 60, text: "Flex" }],
        },
        matches: [
          { id: 1, map: "Haven", score: "13-7", type: "Ranked", time: "2h ago", result: "Win", sub: "ACS: 312" },
          { id: 2, map: "Ascent", score: "11-13", type: "Ranked", time: "4h ago", result: "Loss", sub: "ACS: 210" },
          { id: 3, map: "Bind", score: "13-9", type: "Scrim", time: "Hôm qua", result: "Win", sub: "ACS: 280" },
        ],
        dailyMatches: [{ id: 1, avatar: "🐉", name: "Hà_Smoke", desc: "Platinum 3 · Controller", score: 92 }, { id: 2, avatar: "🐺", name: "ĐứcJG", desc: "Diamond 4 · Initiator", score: 85 }],
        pendingComms: { avatar: "🌸", name: "TrangKill", msg: "Scrim Val tối nay không?" },
      },
    },
  };
}

export async function getDashboardView() {
  try {
    return await apiFetch<DashboardView>("/profiles/dashboard");
  } catch {
    return fallbackDashboardView();
  }
}

function fallbackProfileView(): ProfileView {
  return {
    displayName: currentUser.displayName,
    email: "minh@fpt.edu.vn",
    university: "FPT U HCM",
    avatarEmoji: "🦊",
    gameLabel: currentUser.gameId === "valorant" ? "Valorant" : "League of Legends",
    gameTheme: currentUser.gameId === "valorant" ? "valorant" : "lol",
    rankLabel: currentUser.rankLabel,
    roleLabel: currentUser.roleLabel,
    riotId: currentUser.riotId,
    bio: currentUser.bio || "Duelist chính hiệu, thích scrim nghiêm túc nhưng vẫn vui vẻ, không toxic.",
    lookingForTeam: currentUser.lookingForTeam,
    verificationLabel: currentUser.verificationStatus === "verified" ? "Verified" : "Self-reported",
    reputationLabel: currentUser.reputationBadge,
    emailVerified: true,
    goals: currentUser.goalIds,
    communicationStyles: currentUser.commStyleIds,
    availability: currentUser.schedule.split(",").map((item, index) => ({ label: item.trim(), detail: index === 0 ? "Khung giờ chính" : "Khung giờ phụ", tag: index === 0 ? "Stable" : "Flexible" })),
    readiness: {
      percent: 85,
      checks: [
        { label: "Basic Info", complete: true },
        { label: "Game & Rank", complete: true },
        { label: "Schedule", complete: true },
        { label: "Goals", complete: true },
        { label: "Comm Style", complete: currentUser.commStyleIds.length >= 2 },
        { label: "Riot ID Verification", complete: currentUser.verificationStatus === "verified" },
      ],
    },
    gameConnections: [
      {
        game: "League of Legends",
        gameId: "league_of_legends",
        icon: "🧙",
        status: currentUser.riotId ? "ready_to_verify" : "not_connected",
        statusLabel: currentUser.riotId ? "Ready to verify" : "Not connected",
        description: "Dùng Riot ID để lấy PUUID, Summoner data và ranked info qua Riot API.",
        requirement: "Cần RIOT_API_KEY. Xác minh sở hữu mạnh nên dùng RSO nếu mở public beta.",
        complexity: "Medium",
      },
      {
        game: "Valorant",
        gameId: "valorant",
        icon: "🔫",
        status: currentUser.verificationStatus === "verified" && currentUser.gameId === "valorant" ? "connected" : "requires_rso",
        statusLabel: currentUser.verificationStatus === "verified" && currentUser.gameId === "valorant" ? "Connected" : "Requires RSO",
        description: "Valorant official APIs yêu cầu người chơi opt-in qua Riot Sign On để chia sẻ dữ liệu cá nhân.",
        requirement: "Cần production key + RSO client. Personal key không hỗ trợ Valorant app.",
        complexity: "High",
      },
    ],
    teams: mockTeams.slice(0, 1).map((team) => ({
      id: team.id,
      name: team.name,
      tag: team.tag,
      gameLabel: team.gameId === "valorant" ? "Valorant" : "League of Legends",
      role: team.captainName === currentUser.displayName ? "Captain" : "Member",
      memberCount: team.memberCount,
      neededRoles: team.neededRoles,
    })),
  };
}

export async function getMyProfileView() {
  try {
    const payload = await apiFetch<{ profileView: ProfileView | null }>("/profiles/me");
    return payload.profileView ?? fallbackProfileView();
  } catch {
    return fallbackProfileView();
  }
}

export async function verifyRiotId() {
  return apiFetch("/profiles/riot/verify", { method: "POST" });
}

export async function login(email: string, password: string) {
  if (shouldUseDemoFallback() && isDemoCredential(email, password)) {
    const data = { accessToken: "demo-token" };
    setToken(data.accessToken);
    return data;
  }

  try {
    const data = await publicFetch<{ accessToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.accessToken);
    return data;
  } catch (error) {
    if (isDemoCredential(email, password)) {
      const data = { accessToken: "demo-token" };
      setToken(data.accessToken);
      return data;
    }
    throw error;
  }
}

export async function register(email: string, password: string, displayName: string) {
  const data = await publicFetch<{ accessToken: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName }),
  });
  setToken(data.accessToken);
  return data;
}

export async function forgotPassword(email: string) {
  return publicFetch<{ message: string; resetToken?: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string) {
  return publicFetch<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export async function saveOnboarding(input: {
  game: string;
  rankLabel: string;
  role: string;
  schedule: string;
  goals: string[];
  communicationStyles: string[];
  riotId?: string;
}) {
  const rankParts = input.rankLabel.trim().split(/\s+/);
  const maybeLevel = Number(rankParts.at(-1));
  const rankLevel = Number.isInteger(maybeLevel) ? maybeLevel : undefined;
  const rankTier = rankLevel ? rankParts.slice(0, -1).join(" ") : input.rankLabel;

  return apiFetch("/profiles/onboarding", {
    method: "POST",
    body: JSON.stringify({
      game: input.game,
      rankTier,
      rankLevel,
      role: input.role,
      schedule: input.schedule.split(",").map((item) => item.trim()).filter(Boolean),
      goals: input.goals,
      communicationStyles: input.communicationStyles,
      riotId: input.riotId || undefined,
    }),
  });
}

export async function getTeams() {
  try {
    const data = await apiFetch<{ teams: any[] }>("/teams");
    return data.teams.map(mapTeam);
  } catch {
    return mockTeams;
  }
}

export async function createTeam(input: {
  name: string;
  game: string;
  rankMin: string;
  rankMax: string;
  neededRoles: string[];
  schedule: string[];
  goals: string[];
  communicationStyle: string;
  description?: string;
}) {
  const data = await apiFetch<{ team: any }>("/teams", {
    method: "POST",
    body: JSON.stringify({ ...input, recruitmentOpen: true }),
  });
  return mapTeam(data.team);
}

export async function getTeam(id: string) {
  try {
    const data = await apiFetch<{ team: any }>(`/teams/${id}`);
    return mapTeam(data.team);
  } catch {
    return mockTeams.find((team) => team.id === id) ?? null;
  }
}

export async function getMatches(mode: "players" | "teams") {
  try {
    const data = await apiFetch<{ matches: any[] }>("/match/find", {
      method: "POST",
      body: JSON.stringify({ mode: mode === "players" ? "find_players" : "find_teams" }),
    });
    return data.matches.map(mapMatch);
  } catch {
    return mockMatchResults.filter((match) => (mode === "players" ? match.type === "player" : match.type === "team"));
  }
}

export async function getFindMatchView(mode: "players" | "teams") {
  try {
    const data = await apiFetch<Omit<FindMatchView, "matches"> & { matches: any[] }>("/match/find", {
      method: "POST",
      body: JSON.stringify({ mode: mode === "players" ? "find_players" : "find_teams" }),
    });
    return {
      ...data,
      matches: data.matches.map(mapMatch),
    } satisfies FindMatchView;
  } catch {
    return fallbackFindMatchView(mode);
  }
}

export async function getRequests() {
  try {
    const data = await apiFetch<{ requests: any[] }>("/match/requests");
    return data.requests.map(mapRequest);
  } catch {
    return mockRequests;
  }
}

export async function updateRequest(id: string, action: "accept" | "decline" | "cancel") {
  return apiFetch(`/match/requests/${id}/${action}`, { method: "PUT" });
}

export async function createMatchRequest(input: {
  targetType: "player" | "team";
  targetId: string;
  message: string;
}) {
  return apiFetch("/match/requests", {
    method: "POST",
    body: JSON.stringify({
      type: input.targetType === "player" ? "PLAYER_TO_PLAYER" : "PLAYER_TO_TEAM",
      receiverId: input.targetType === "player" ? input.targetId : undefined,
      teamId: input.targetType === "team" ? input.targetId : undefined,
      message: input.message,
    }),
  });
}

function mapCoach(coach: any): Coach {
  const profile = coach.user?.profile;
  return {
    id: coach.id,
    userId: coach.userId ?? coach.user?.id,
    displayName: coach.user?.displayName ?? "Coach",
    game: coach.game === "VALORANT" ? "Valorant" : "League of Legends",
    specialties: coach.specialties ?? [],
    hourlyRate: coach.hourlyRate,
    bio: coach.bio,
    availability: coach.availability ?? [],
    rank: rankLabel(profile?.rankTier, profile?.rankLevel),
    reputationBadge: profile?.reputationBadge ? profile.reputationBadge[0] + profile.reputationBadge.slice(1).toLowerCase() : "New",
  };
}

function mapCoachingRequest(request: any): CoachingRequest {
  const coach = request.coach ?? {};
  return {
    id: request.id,
    coachId: request.coachId,
    coachName: coach.user?.displayName ?? request.coachName ?? "Coach",
    playerName: request.player?.displayName ?? "Player",
    proposedStartAt: request.proposedStartAt,
    durationMinutes: request.durationMinutes,
    proposedPrice: request.proposedPrice,
    message: request.message,
    status: request.status.toLowerCase(),
    lastProposedById: request.lastProposedById,
    isCoach: Boolean(coach.user?.id && coach.user.id === request.lastProposedById) || false,
  } as CoachingRequest;
}

export async function getCoaches() {
  try {
    const data = await apiFetch<{ coaches: any[] }>("/coaching/coaches");
    return data.coaches.map(mapCoach);
  } catch {
    return mockCoaches;
  }
}

export async function getCoachDetail(id: string): Promise<CoachDetail> {
  try {
    const data = await apiFetch<{ coach: any }>(`/coaching/coaches/${id}`);
    const coach = data.coach;
    const profile = coach.user?.profile;
    const feedbacks = (coach.feedbacks ?? []).map((fb: any) => ({
      id: fb.id,
      playerName: fb.player?.displayName ?? "Player",
      rating: fb.rating,
      comment: fb.comment,
      createdAt: fb.createdAt,
    }));
    const avgRating = feedbacks.length ? feedbacks.reduce((s: number, f: any) => s + f.rating, 0) / feedbacks.length : 0;
    return {
      id: coach.id,
      userId: coach.userId ?? coach.user?.id,
      displayName: coach.user?.displayName ?? "Coach",
      game: coach.game === "VALORANT" ? "Valorant" : "League of Legends",
      specialties: coach.specialties ?? [],
      hourlyRate: coach.hourlyRate,
      bio: coach.bio,
      availability: coach.availability ?? [],
      rank: rankLabel(profile?.rankTier, profile?.rankLevel),
      reputationBadge: profile?.reputationBadge ? profile.reputationBadge[0] + profile.reputationBadge.slice(1).toLowerCase() : "New",
      riotId: profile?.riotId ?? null,
      verificationStatus: profile?.verificationStatus === "VERIFIED" ? "Verified" : "Self-reported",
      totalSessions: coach.requests?.length ?? 0,
      avgRating: Math.round(avgRating * 10) / 10,
      feedbacks,
    };
  } catch {
    return mockCoachDetails[id] ?? mockCoaches[0] as CoachDetail;
  }
}

export async function submitCoachFeedback(coachId: string, input: { rating: number; comment: string }) {
  return apiFetch(`/coaching/coaches/${coachId}/feedback`, { method: "POST", body: JSON.stringify(input) });
}

export async function createCoachProfile(input: { game: string; specialties: string[]; hourlyRate: number; bio: string; availability: string[] }) {
  return apiFetch("/coaching/coaches/me", { method: "POST", body: JSON.stringify(input) });
}

export async function getCoachingRequests() {
  try {
    const data = await apiFetch<{ requests: any[] }>("/coaching/requests");
    return data.requests.map(mapCoachingRequest);
  } catch {
    return [];
  }
}

export async function createCoachingRequest(input: { coachId: string; proposedStartAt: string; durationMinutes: number; proposedPrice: number; message: string }) {
  return apiFetch("/coaching/requests", { method: "POST", body: JSON.stringify(input) });
}

export async function updateCoachingRequest(id: string, action: "counter" | "agree" | "cancel", input?: { proposedStartAt: string; durationMinutes: number; proposedPrice: number; message: string }) {
  return apiFetch(`/coaching/requests/${id}/${action}`, { method: "PUT", body: input ? JSON.stringify(input) : undefined });
}

export async function getConversations() {
  try {
    const data = await apiFetch<{ conversations: any[] }>("/conversations");
    return data.conversations.map(mapConversation);
  } catch {
    return mockConversations;
  }
}

export async function getConversation(id: string) {
  try {
    const data = await apiFetch<{ conversation: any }>(`/conversations/${id}`);
    const conversation = mapConversation(data.conversation);
    const messages = (data.conversation.messages ?? []).map((message: any) => ({
      id: message.id,
      conversationId: id,
      senderId: message.senderId,
      text: message.content,
      createdAt: message.createdAt,
    }));
    return { conversation, messages };
  } catch {
    return {
      conversation: mockConversations.find((conversation) => conversation.id === id) ?? null,
      messages: mockMessages[id] ?? [],
    };
  }
}

export async function sendMessage(conversationId: string, content: string) {
  return apiFetch(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function getEvents() {
  try {
    const data = await publicFetch<{ events: any[] }>("/tournaments");
    return data.events.map(mapEvent);
  } catch {
    return mockEvents;
  }
}

export async function getEvent(id: string) {
  try {
    const data = await publicFetch<{ event: any }>(`/tournaments/${id}`);
    return mapEvent(data.event);
  } catch {
    return mockEvents.find((event) => event.id === id) ?? null;
  }
}

export function getFallbackPlayers() {
  return mockPlayers;
}

export function getFallbackProfile() {
  return currentUser;
}

export function getFallbackTeams() {
  return mockTeams;
}

export function getFallbackMatches(mode: "players" | "teams") {
  return mockMatchResults.filter((match) => (mode === "players" ? match.type === "player" : match.type === "team"));
}

export function getFallbackRequests() {
  return mockRequests;
}

export function getFallbackConversations() {
  return mockConversations;
}

export function getFallbackEvents() {
  return mockEvents;
}
