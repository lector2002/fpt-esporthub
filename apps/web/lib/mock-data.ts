import type { PlayerProfile, TeamProfile, MatchResult, MatchRequest, Conversation, Message, TournamentEvent, Coach, CoachDetail } from "./types";

export const currentUser: PlayerProfile = {
  id: "player-1",
  userId: "user-1",
  displayName: "MinhNguyen",
  bio: "Sinh viên FPT, main Duelist, muốn leo rank.",
  avatarUrl: null,
  gameId: "valorant",
  rankLabel: "Gold 2",
  roleLabel: "Duelist",
  schedule: "Tối T2-T6, cuối tuần rảnh",
  goalIds: ["rank_climb", "find_team"],
  commStyleIds: ["try_hard", "shotcaller"],
  lookingForTeam: true,
  riotId: "MinhNguyen#VN2",
  verificationStatus: "verified",
  reputationBadge: "Verified",
  onboardingComplete: true,
};

export const mockPlayers: PlayerProfile[] = [
  { id: "p2", userId: "u2", displayName: "AnhTuSupport", bio: "Support chính hiệu.", avatarUrl: null, gameId: "league_of_legends", rankLabel: "Platinum 3", roleLabel: "Support", schedule: "Tối hàng ngày", goalIds: ["rank_climb", "join_tournaments"], commStyleIds: ["shotcaller", "beginner_friendly"], lookingForTeam: false, riotId: "AnhTu#NA1", verificationStatus: "verified", reputationBadge: "Trusted", onboardingComplete: true },
  { id: "p3", userId: "u3", displayName: "HieuSniper", bio: "Awper chuyên nghiệp.", avatarUrl: null, gameId: "valorant", rankLabel: "Silver 3", roleLabel: "Initiator", schedule: "Tối T2,T4,T6", goalIds: ["scrim_practice", "find_team"], commStyleIds: ["quiet_focus", "try_hard"], lookingForTeam: true, riotId: "HieuSniper#VN1", verificationStatus: "self_reported", reputationBadge: "New", onboardingComplete: true },
  { id: "p4", userId: "u4", displayName: "LinhMid", bio: "Mid main, game nhiều.", avatarUrl: null, gameId: "league_of_legends", rankLabel: "Gold 1", roleLabel: "Mid", schedule: "Cuối tuần", goalIds: ["casual_play", "find_team"], commStyleIds: ["chill", "quiet_focus"], lookingForTeam: true, riotId: null, verificationStatus: "unverified", reputationBadge: "New", onboardingComplete: true },
  { id: "p5", userId: "u5", displayName: "KhoaSentinel", bio: "Sentinel, call tốt.", avatarUrl: null, gameId: "valorant", rankLabel: "Diamond 1", roleLabel: "Sentinel", schedule: "Tối T2-T7", goalIds: ["rank_climb", "scrim_practice", "join_tournaments"], commStyleIds: ["shotcaller", "try_hard"], lookingForTeam: true, riotId: "Khoa#1011", verificationStatus: "verified", reputationBadge: "Trusted", onboardingComplete: true },
  { id: "p6", userId: "u6", displayName: "TrangJungle", bio: "Jungle main, thích chill.", avatarUrl: null, gameId: "league_of_legends", rankLabel: "Silver 2", roleLabel: "Jungle", schedule: "Tối hàng ngày", goalIds: ["casual_play", "rank_climb"], commStyleIds: ["chill", "beginner_friendly"], lookingForTeam: false, riotId: null, verificationStatus: "unverified", reputationBadge: "New", onboardingComplete: true },
];

export const mockTeams: TeamProfile[] = [
  { id: "team-1", name: "Phoenix Rising", tag: "PR", description: "Team Valorant nghiêm túc.", gameId: "valorant", captainName: "KhoaSentinel", memberCount: 3, neededRoles: ["Duelist", "Controller"], rankRange: "Gold-Diamond", schedule: "Tối T2,T4,T6", goalIds: ["scrim_practice", "join_tournaments"], commStyleIds: ["try_hard", "shotcaller"], recruitmentOpen: true, createdAt: "2026-05-01" },
  { id: "team-2", name: "Dragon Army", tag: "DA", description: "Team LOL leo rank.", gameId: "league_of_legends", captainName: "AnhTuSupport", memberCount: 4, neededRoles: ["Top"], rankRange: "Silver-Platinum", schedule: "Tối hàng ngày", goalIds: ["rank_climb"], commStyleIds: ["chill", "quiet_focus"], recruitmentOpen: true, createdAt: "2026-04-15" },
  { id: "team-3", name: "Night Owls", tag: "NOW", description: "Team chơi đêm.", gameId: "valorant", captainName: "HieuSniper", memberCount: 2, neededRoles: ["Duelist", "Initiator", "Controller"], rankRange: "Iron-Gold", schedule: "Tối sau 10h", goalIds: ["casual_play", "find_members"], commStyleIds: ["chill", "beginner_friendly"], recruitmentOpen: true, createdAt: "2026-06-01" },
];

export const mockMatchResults: MatchResult[] = [
  { id: "m1", type: "player", name: "KhoaSentinel", game: "Valorant", rank: "Diamond 1", role: "Sentinel", schedule: "Tối T2-T7", score: 92, reasons: ["Rank gần nhau", "Goal: Rank climb", "Cùng schedule"], reputationBadge: "Trusted", verificationStatus: "Verified" },
  { id: "m2", type: "player", name: "HieuSniper", game: "Valorant", rank: "Silver 3", role: "Initiator", schedule: "Tối T2,T4,T6", score: 78, reasons: ["Cùng game", "Goal: Find team / Scrim", "Role bổ trợ"], reputationBadge: "New", verificationStatus: "Self-reported" },
  { id: "m3", type: "player", name: "LinhMid", game: "League of Legends", rank: "Gold 1", role: "Mid", schedule: "Cuối tuần", score: 45, reasons: ["Khác game", "Schedule khác biệt"], reputationBadge: "New", verificationStatus: "Unverified" },
  { id: "m4", type: "team", name: "Phoenix Rising (PR)", game: "Valorant", rank: "Gold-Diamond", role: "Cần Duelist", schedule: "Tối T2,T4,T6", score: 88, reasons: ["Cần role của bạn", "Rank phù hợp", "Cùng game"], reputationBadge: "Trusted", verificationStatus: "Verified" },
  { id: "m5", type: "team", name: "Night Owls (NOW)", game: "Valorant", rank: "Iron-Gold", role: "Cần Duelist", schedule: "Tối sau 10h", score: 65, reasons: ["Cần role của bạn", "Cùng game"], reputationBadge: "New", verificationStatus: "Self-reported" },
];

export const mockRequests: MatchRequest[] = [
  { id: "req-1", fromUserId: "p5", fromName: "KhoaSentinel", toUserId: "player-1", toName: "MinhNguyen", type: "player_to_player", status: "pending", message: "Chơi cùng không? Đang kiếm Duelist cho team.", createdAt: "2026-06-25T20:00:00Z" },
  { id: "req-2", fromUserId: "player-1", fromName: "MinhNguyen", toUserId: "team-1", toName: "Phoenix Rising", type: "player_to_team", status: "accepted", message: "Mình muốn apply vào team.", createdAt: "2026-06-24T18:00:00Z" },
  { id: "req-3", fromUserId: "p3", fromName: "HieuSniper", toUserId: "player-1", toName: "MinhNguyen", type: "player_to_player", status: "declined", message: "Hi, muốn chơi cùng không?", createdAt: "2026-06-23T15:00:00Z" },
];

export const mockConversations: Conversation[] = [
  { id: "conv-1", otherUserName: "KhoaSentinel", otherUserBadge: "Trusted", lastMessage: "Ok, tối nay 9h tập nhé!", lastMessageAt: "2026-06-26T09:00:00Z", unread: true },
  { id: "conv-2", otherUserName: "AnhTuSupport", otherUserBadge: "Trusted", lastMessage: "Có giải mới, xem thử đi.", lastMessageAt: "2026-06-25T22:00:00Z", unread: false },
];

export const mockMessages: Record<string, Message[]> = {
  "conv-1": [
    { id: "msg-1", conversationId: "conv-1", senderId: "p5", text: "Chào, tối nay tập được không?", createdAt: "2026-06-26T08:00:00Z" },
    { id: "msg-2", conversationId: "conv-1", senderId: "player-1", text: "Được, mình rảnh 9h.", createdAt: "2026-06-26T08:15:00Z" },
    { id: "msg-3", conversationId: "conv-1", senderId: "p5", text: "Ok, tối nay 9h tập nhé!", createdAt: "2026-06-26T09:00:00Z" },
  ],
  "conv-2": [
    { id: "msg-4", conversationId: "conv-2", senderId: "u2", text: "Có giải mới, xem thử đi.", createdAt: "2026-06-25T22:00:00Z" },
    { id: "msg-5", conversationId: "conv-2", senderId: "player-1", text: "OK, mình xem đã.", createdAt: "2026-06-25T22:30:00Z" },
  ],
};

export const mockEvents: TournamentEvent[] = [
  { id: "evt-1", title: "FPT Summer Championship 2026", game: "Valorant", date: "2026-08-15", organizer: "FPT Esport Club", rules: "5v5, Bo3, single elim", deadline: "2026-08-01", interestedCount: 24, description: "Giải đấu Valorant mùa hè dành cho sinh viên FPT." },
  { id: "evt-2", title: "LOL University Cup", game: "League of Legends", date: "2026-09-01", organizer: "VUG Esports", rules: "5v5, Bo1 vòng bảng, Bo3 playoffs", deadline: "2026-08-20", interestedCount: 18, description: "Giải LOL cho các trường đại học." },
  { id: "evt-3", title: "Night Scrim Series #1", game: "Valorant", date: "2026-07-10", organizer: "Phoenix Rising", rules: "Scrim Bo3, không chính thức", deadline: "2026-07-08", interestedCount: 6, description: "Scrim tập luyện giữa các team." },
];

export const mockCoaches: Coach[] = [
  { id: "coach-1", userId: "u5", displayName: "KhoaSentinel", game: "Valorant", specialties: ["Sentinel setup", "VOD review", "Shotcalling"], hourlyRate: 180000, bio: "Coach Valorant cho người chơi muốn cải thiện game sense, setup site và giao tiếp trong đội.", availability: ["Tối T3", "Tối T5", "Cuối tuần"], rank: "Diamond 1", reputationBadge: "Trusted" },
  { id: "coach-2", userId: "u2", displayName: "AnhTuSupport", game: "League of Legends", specialties: ["Support macro", "Vision control", "Rank climbing"], hourlyRate: 150000, bio: "Coach LoL tập trung vào macro, kiểm soát tầm nhìn và cách phối hợp bot lane hiệu quả.", availability: ["Tối T2", "Tối T6", "Chiều Chủ nhật"], rank: "Platinum 3", reputationBadge: "Trusted" },
  { id: "coach-3", userId: "u4", displayName: "LinhMid", game: "League of Legends", specialties: ["Mid lane mechanics", "Map awareness", "Wave management"], hourlyRate: 120000, bio: "Mid main muốn chia sẻ kinh nghiệm cho người chơi mới bắt đầu leo rank LoL.", availability: ["Cuối tuần"], rank: "Gold 1", reputationBadge: "New" },
  { id: "coach-4", userId: "u3", displayName: "HieuSniper", game: "Valorant", specialties: ["Aim training", "Entry fragging", "Crosshair placement"], hourlyRate: 100000, bio: "Coach aim và mechanics cho Duelist, phù hợp người chơi muốn cải thiện kỹ năng cá nhân.", availability: ["Tối T2", "Tối T4", "Tối T6"], rank: "Silver 3", reputationBadge: "New" },
];

export const mockCoachDetails: Record<string, CoachDetail> = {
  "coach-1": { ...mockCoaches[0], riotId: "Khoa#1011", verificationStatus: "Verified", totalSessions: 5, avgRating: 4.5, feedbacks: [
    { id: "fb-1", playerName: "MinhNguyen", rating: 5, comment: "Coach rất tận tâm, giải thích rõ ràng cách setup site và call team. Mình leo từ Gold lên Platinum sau 2 tuần.", createdAt: "2026-07-01T10:00:00Z" },
    { id: "fb-2", playerName: "HieuSniper", rating: 4, comment: "VOD review chi tiết, chỉ ra nhiều lỗi mình không nhận ra. Recommend cho ai muốn cải thiện game sense.", createdAt: "2026-07-05T14:30:00Z" },
  ] },
  "coach-2": { ...mockCoaches[1], riotId: "AnhTu#NA1", verificationStatus: "Verified", totalSessions: 3, avgRating: 5.0, feedbacks: [
    { id: "fb-3", playerName: "LinhMid", rating: 5, comment: "Anh coach rất kiên nhẫn, dạy macro và ward control cực kỳ dễ hiểu. Mình rank Gold sau 1 tháng học.", createdAt: "2026-07-03T09:00:00Z" },
  ] },
  "coach-3": { ...mockCoaches[2], riotId: null, verificationStatus: "Self-reported", totalSessions: 1, avgRating: 4.0, feedbacks: [
    { id: "fb-4", playerName: "MinhNguyen", rating: 4, comment: "Giới thiệu cơ bản về mid lane ok, nhưng cần thêm kinh nghiệm thực战.", createdAt: "2026-07-06T16:00:00Z" },
  ] },
  "coach-4": { ...mockCoaches[3], riotId: "HieuSniper#VN1", verificationStatus: "Self-reported", totalSessions: 0, avgRating: 0, feedbacks: [] },
};
