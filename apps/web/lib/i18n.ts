"use client";

import { useEffect, useState } from "react";

export type Language = "en" | "vi";

const LANGUAGE_KEY = "fpt-esporthub-language";

const translations = {
  en: {
    dashboard: "Dashboard",
    findMatch: "Find Match",
    teams: "Teams",
    coaches: "Coaches",
    events: "Events",
    profile: "Profile",
    logout: "Logout",
    squad: "Squad",
    squadComms: "Squad Comms",
    requestsMessages: "Requests & Messages",
    requestDetail: "Request Detail",
    liveChat: "Live Chat",
    recruitmentRequests: "Recruitment requests",
    viewAll: "View all",
    teamMessages: "Team messages",
    openInbox: "Open inbox",
    noPendingRequests: "No pending requests. Keep grinding.",
    noMessages: "No messages yet. Accept a request to open chat.",
    closeComms: "Close comms panel",
    openComms: "Open squad comms",
    back: "Back",
    accept: "Accept",
    decline: "Decline",
    cancel: "Cancel",
    openFullRequests: "Open full requests",
    send: "Send",
    sendQuickComms: "Send quick comms...",
    requestStatus: "Request status",
    squadChannel: "squad channel",
    dailyBattleBrief: "Daily battle brief",
    dashboardTitle: "Dashboard",
    welcomeBack: "Welcome back, {name}.",
    squadQueueWarmup: "Your squad queue is warming up.",
    liveLeads: "live leads",
    currentRank: "current rank",
    combatRole: "combat role",
    dailyMatchDrills: "Daily Match Drills",
    profileSummary: "Your Profile Summary",
    game: "Game",
    rank: "Rank",
    role: "Role",
    badge: "Badge",
    lookingForTeam: "Looking for team",
    yes: "Yes",
    no: "No",
    myProfile: "My Profile",
    language: "Language",
    english: "English",
    vietnamese: "Vietnamese",
    interfaceLanguage: "Interface language",
    gameDetails: "Game Details",
    schedule: "Schedule",
    riotId: "Riot ID",
    goalsCommunication: "Goals & Communication",
    goals: "Goals",
    style: "Style",
    myTeams: "My Teams",
    findPlayers: "Find Players",
    findTeams: "Find Teams",
    sendRequest: "Send Request",
    noMatches: "No matches found. Try updating your profile or check back later.",
    tournamentEvents: "Tournament Events",
    interested: "I'm Interested",
    details: "Details",
    playersInterested: "players interested",
    messages: "Messages",
    noConversations: "No conversations yet. Accept a request to start chatting.",
    typeMessage: "Type a message...",
    requests: "Requests",
    noRequests: "No requests yet.",
    openChat: "Open Chat",
    createTeam: "Create Team",
    viewTeam: "View Team",
    noTeams: "No teams yet. Create one!",
  },
  vi: {
    dashboard: "Bảng điều khiển",
    findMatch: "Tìm đồng đội",
    teams: "Đội hình",
    coaches: "Coach",
    events: "Giải đấu",
    profile: "Hồ sơ",
    logout: "Đăng xuất",
    squad: "Đội",
    squadComms: "Liên lạc đội",
    requestsMessages: "Lời mời & Tin nhắn",
    requestDetail: "Chi tiết lời mời",
    liveChat: "Chat nhanh",
    recruitmentRequests: "Lời mời tuyển đội",
    viewAll: "Xem tất cả",
    teamMessages: "Tin nhắn đội",
    openInbox: "Mở hộp thư",
    noPendingRequests: "Chưa có lời mời mới. Tiếp tục luyện tập.",
    noMessages: "Chưa có tin nhắn. Chấp nhận lời mời để mở chat.",
    closeComms: "Đóng bảng liên lạc",
    openComms: "Mở liên lạc đội",
    back: "Quay lại",
    accept: "Chấp nhận",
    decline: "Từ chối",
    cancel: "Hủy",
    openFullRequests: "Mở trang lời mời",
    send: "Gửi",
    sendQuickComms: "Gửi tin nhanh...",
    requestStatus: "Trạng thái lời mời",
    squadChannel: "kênh đội",
    dailyBattleBrief: "Bản tin luyện tập hôm nay",
    dashboardTitle: "Bảng điều khiển",
    welcomeBack: "Chào mừng trở lại, {name}.",
    squadQueueWarmup: "Hàng chờ tìm đội của bạn đang nóng lên.",
    liveLeads: "gợi ý đang sẵn sàng",
    currentRank: "rank hiện tại",
    combatRole: "vai trò thi đấu",
    dailyMatchDrills: "Bài tập ghép đội hôm nay",
    profileSummary: "Tóm tắt hồ sơ",
    game: "Tựa game",
    rank: "Rank",
    role: "Vai trò",
    badge: "Huy hiệu",
    lookingForTeam: "Đang tìm đội",
    yes: "Có",
    no: "Không",
    myProfile: "Hồ sơ của tôi",
    language: "Ngôn ngữ",
    english: "Tiếng Anh",
    vietnamese: "Tiếng Việt",
    interfaceLanguage: "Ngôn ngữ giao diện",
    gameDetails: "Thông tin game",
    schedule: "Lịch chơi",
    riotId: "Riot ID",
    goalsCommunication: "Mục tiêu & Giao tiếp",
    goals: "Mục tiêu",
    style: "Phong cách",
    myTeams: "Đội của tôi",
    findPlayers: "Tìm người chơi",
    findTeams: "Tìm đội",
    sendRequest: "Gửi lời mời",
    noMatches: "Chưa tìm thấy kết quả phù hợp. Hãy cập nhật hồ sơ hoặc quay lại sau.",
    tournamentEvents: "Sự kiện giải đấu",
    interested: "Tôi quan tâm",
    details: "Chi tiết",
    playersInterested: "người quan tâm",
    messages: "Tin nhắn",
    noConversations: "Chưa có cuộc trò chuyện. Chấp nhận lời mời để bắt đầu chat.",
    typeMessage: "Nhập tin nhắn...",
    requests: "Lời mời",
    noRequests: "Chưa có lời mời.",
    openChat: "Mở chat",
    createTeam: "Tạo đội",
    viewTeam: "Xem đội",
    noTeams: "Chưa có đội. Hãy tạo đội đầu tiên!",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

function readLanguage(): Language {
  if (typeof window === "undefined") return "vi";
  return window.localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "vi";
}

export function setLanguagePreference(language: Language) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LANGUAGE_KEY, language);
  window.dispatchEvent(new CustomEvent("fpt-esporthub:language-change", { detail: language }));
}

export function useLanguage() {
  const [language, setLanguage] = useState<Language>("vi");

  useEffect(() => {
    setLanguage(readLanguage());

    const handleChange = (event: Event) => {
      setLanguage((event as CustomEvent<Language>).detail ?? readLanguage());
    };
    window.addEventListener("fpt-esporthub:language-change", handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener("fpt-esporthub:language-change", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const t = (key: TranslationKey, values?: Record<string, string | number>) => {
    let text: string = translations[language][key];
    if (values) {
      for (const [name, value] of Object.entries(values)) {
        text = text.replace(`{${name}}`, String(value));
      }
    }
    return text;
  };

  return { language, setLanguage: setLanguagePreference, t };
}
