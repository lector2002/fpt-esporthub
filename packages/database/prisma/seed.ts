import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const passwordHash = "$2b$10$E9jL/I8KCgGKzP.Jd3XL0eEHAT5zEkLuyyFWsp7rcprs3eY3/wF1a"; // Password123!

async function upsertUser(id: string, email: string, displayName: string, role: "USER" | "ADMIN" = "USER") {
  return prisma.user.upsert({
    where: { email },
    update: { displayName, role, passwordHash },
    create: { id, email, displayName, role, passwordHash },
  });
}

async function main() {
  const admin = await upsertUser("seed-admin", "admin@fpt-esporthub.local", "Admin", "ADMIN");
  const minh = await upsertUser("seed-user-minh", "minh@fpt.edu.vn", "MinhNguyen");
  const khoa = await upsertUser("seed-user-khoa", "khoa@fpt.edu.vn", "KhoaSentinel");
  const hieu = await upsertUser("seed-user-hieu", "hieu@fpt.edu.vn", "HieuSniper");
  const anhtu = await upsertUser("seed-user-anhtu", "anhtu@fpt.edu.vn", "AnhTuSupport");
  const linh = await upsertUser("seed-user-linh", "linh@fpt.edu.vn", "LinhMid");

  await prisma.playerProfile.upsert({
    where: { userId: minh.id },
    update: {},
    create: {
      userId: minh.id,
      game: "VALORANT",
      rankTier: "Gold",
      rankLevel: 2,
      role: "Duelist",
      schedule: ["weekday_evening", "weekend"],
      goals: ["rank_climb", "find_team"],
      communicationStyles: ["try_hard", "shotcaller"],
      riotId: "MinhNguyen#VN2",
      verificationStatus: "VERIFIED",
      reputationBadge: "VERIFIED",
      bio: "Sinh vien FPT, main Duelist, muon leo rank.",
      onboardingComplete: true,
    },
  });

  await prisma.playerProfile.upsert({
    where: { userId: khoa.id },
    update: {},
    create: {
      userId: khoa.id,
      game: "VALORANT",
      rankTier: "Diamond",
      rankLevel: 1,
      role: "Sentinel",
      schedule: ["weekday_evening", "weekend"],
      goals: ["rank_climb", "scrim_practice"],
      communicationStyles: ["try_hard", "shotcaller"],
      riotId: "Khoa#1011",
      verificationStatus: "VERIFIED",
      reputationBadge: "TRUSTED",
      bio: "Sentinel, call tot, dang tuyen team nghiem tuc.",
      onboardingComplete: true,
    },
  });

  await prisma.playerProfile.upsert({
    where: { userId: hieu.id },
    update: {},
    create: {
      userId: hieu.id,
      game: "VALORANT",
      rankTier: "Silver",
      rankLevel: 3,
      role: "Initiator",
      schedule: ["weekday_evening"],
      goals: ["scrim_practice", "find_team"],
      communicationStyles: ["quiet_focus", "try_hard"],
      riotId: "HieuSniper#VN1",
      verificationStatus: "SELF_REPORTED",
      reputationBadge: "NEW",
      bio: "Initiator thich tap luyen co lich co dinh.",
      onboardingComplete: true,
    },
  });

  await prisma.playerProfile.upsert({
    where: { userId: anhtu.id },
    update: {},
    create: {
      userId: anhtu.id,
      game: "LEAGUE_OF_LEGENDS",
      rankTier: "Platinum",
      rankLevel: 3,
      role: "Support",
      schedule: ["weekday_evening"],
      goals: ["rank_climb", "join_tournaments"],
      communicationStyles: ["shotcaller", "beginner_friendly"],
      riotId: "AnhTu#VN1",
      verificationStatus: "VERIFIED",
      reputationBadge: "TRUSTED",
      bio: "Support main, uu tien leo rank va di giai.",
      onboardingComplete: true,
    },
  });

  await prisma.playerProfile.upsert({
    where: { userId: linh.id },
    update: {},
    create: {
      userId: linh.id,
      game: "LEAGUE_OF_LEGENDS",
      rankTier: "Gold",
      rankLevel: 1,
      role: "Mid",
      schedule: ["weekend"],
      goals: ["casual_play", "find_team"],
      communicationStyles: ["chill", "quiet_focus"],
      verificationStatus: "UNVERIFIED",
      reputationBadge: "NEW",
      bio: "Mid main, tim nhom choi cuoi tuan.",
      onboardingComplete: true,
    },
  });

  await prisma.coachProfile.upsert({
    where: { userId: khoa.id },
    update: {
      game: "VALORANT",
      specialties: ["Sentinel setup", "VOD review", "Shotcalling"],
      hourlyRate: 180000,
      bio: "Coach Valorant cho người chơi muốn cải thiện game sense, setup site và giao tiếp trong đội.",
      availability: ["Tối T3", "Tối T5", "Cuối tuần"],
      active: true,
    },
    create: {
      userId: khoa.id,
      game: "VALORANT",
      specialties: ["Sentinel setup", "VOD review", "Shotcalling"],
      hourlyRate: 180000,
      bio: "Coach Valorant cho người chơi muốn cải thiện game sense, setup site và giao tiếp trong đội.",
      availability: ["Tối T3", "Tối T5", "Cuối tuần"],
    },
  });

  await prisma.coachProfile.upsert({
    where: { userId: anhtu.id },
    update: {
      game: "LEAGUE_OF_LEGENDS",
      specialties: ["Support macro", "Vision control", "Rank climbing"],
      hourlyRate: 150000,
      bio: "Coach LoL tập trung vào macro, kiểm soát tầm nhìn và cách phối hợp bot lane hiệu quả.",
      availability: ["Tối T2", "Tối T6", "Chiều Chủ nhật"],
      active: true,
    },
    create: {
      userId: anhtu.id,
      game: "LEAGUE_OF_LEGENDS",
      specialties: ["Support macro", "Vision control", "Rank climbing"],
      hourlyRate: 150000,
      bio: "Coach LoL tập trung vào macro, kiểm soát tầm nhìn và cách phối hợp bot lane hiệu quả.",
      availability: ["Tối T2", "Tối T6", "Chiều Chủ nhật"],
    },
  });

  const coachKhoa = await prisma.coachProfile.findFirst({ where: { userId: khoa.id } });
  if (coachKhoa) {
    for (const fb of [
      { playerId: minh.id, rating: 5, comment: "Coach rất tận tâm, giải thích rõ ràng cách setup site và call team. Mình leo từ Gold lên Platinum sau 2 tuần." },
      { playerId: hieu.id, rating: 4, comment: "VOD review chi tiết, chỉ ra nhiều lỗi mình không nhận ra. Recommend cho ai muốn cải thiện game sense." },
    ]) {
      const existing = await prisma.coachFeedback.findFirst({ where: { coachId: coachKhoa.id, playerId: fb.playerId } });
      if (!existing) await prisma.coachFeedback.create({ data: { coachId: coachKhoa.id, ...fb } });
    }
  }

  const coachAnhtu = await prisma.coachProfile.findFirst({ where: { userId: anhtu.id } });
  if (coachAnhtu) {
    for (const fb of [
      { playerId: linh.id, rating: 5, comment: "Anh coach rất kiên nhẫn, dạy macro và ward control cực kỳ dễ hiểu. Mình rank Gold sau 1 tháng học." },
    ]) {
      const existing = await prisma.coachFeedback.findFirst({ where: { coachId: coachAnhtu.id, playerId: fb.playerId } });
      if (!existing) await prisma.coachFeedback.create({ data: { coachId: coachAnhtu.id, ...fb } });
    }
  }

  const phoenix = await prisma.team.upsert({
    where: { id: "seed-team-phoenix" },
    update: {},
    create: {
      id: "seed-team-phoenix",
      captainId: khoa.id,
      name: "Phoenix Rising",
      game: "VALORANT",
      rankMin: "Gold",
      rankMax: "Diamond",
      neededRoles: ["Duelist", "Controller"],
      schedule: ["weekday_evening", "weekend"],
      goals: ["scrim_practice", "join_tournaments"],
      communicationStyle: "try_hard",
      description: "Team Valorant nghiem tuc dang tuyen Duelist va Controller.",
      recruitmentOpen: true,
    },
  });

  const nightOwls = await prisma.team.upsert({
    where: { id: "seed-team-night-owls" },
    update: {},
    create: {
      id: "seed-team-night-owls",
      captainId: hieu.id,
      name: "Night Owls",
      game: "VALORANT",
      rankMin: "Iron",
      rankMax: "Gold",
      neededRoles: ["Duelist", "Initiator", "Controller"],
      schedule: ["late_night", "weekend"],
      goals: ["casual_play", "scrim_practice"],
      communicationStyle: "chill",
      description: "Team choi toi muon, uu tien lich linh hoat.",
      recruitmentOpen: true,
    },
  });

  const dragon = await prisma.team.upsert({
    where: { id: "seed-team-dragon" },
    update: {},
    create: {
      id: "seed-team-dragon",
      captainId: anhtu.id,
      name: "Dragon Army",
      game: "LEAGUE_OF_LEGENDS",
      rankMin: "Silver",
      rankMax: "Platinum",
      neededRoles: ["Top"],
      schedule: ["weekday_evening"],
      goals: ["rank_climb"],
      communicationStyle: "shotcaller",
      description: "Team LOL leo rank, dang thieu Top.",
      recruitmentOpen: true,
    },
  });

  for (const [teamId, userId, role] of [
    [phoenix.id, khoa.id, "captain"],
    [nightOwls.id, hieu.id, "captain"],
    [dragon.id, anhtu.id, "captain"],
  ] as const) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId } },
      update: { role },
      create: { teamId, userId, role },
    });
  }

  await prisma.tournamentEvent.upsert({
    where: { id: "seed-event-valorant-1" },
    update: {},
    create: {
      id: "seed-event-valorant-1",
      title: "FPT Valorant Beta Cup",
      game: "VALORANT",
      organizer: "FPT EsportHub",
      startsAt: new Date("2026-08-01T12:00:00.000Z"),
      deadlineAt: new Date("2026-07-25T12:00:00.000Z"),
      rules: "5v5, Bo3 playoffs, student teams only.",
    },
  });

  await prisma.tournamentEvent.upsert({
    where: { id: "seed-event-lol-1" },
    update: {},
    create: {
      id: "seed-event-lol-1",
      title: "LOL University Cup",
      game: "LEAGUE_OF_LEGENDS",
      organizer: "VUG Esports",
      startsAt: new Date("2026-09-01T12:00:00.000Z"),
      deadlineAt: new Date("2026-08-20T12:00:00.000Z"),
      rules: "5v5, group stage Bo1, playoffs Bo3.",
    },
  });

  await prisma.tournamentEventInterest.upsert({
    where: { eventId_userId: { eventId: "seed-event-valorant-1", userId: minh.id } },
    update: {},
    create: { eventId: "seed-event-valorant-1", userId: minh.id },
  });

  await prisma.matchRequest.upsert({
    where: { id: "seed-request-khoa-to-minh" },
    update: {},
    create: {
      id: "seed-request-khoa-to-minh",
      senderId: khoa.id,
      receiverId: minh.id,
      type: "PLAYER_TO_PLAYER",
      status: "PENDING",
      message: "Choi cung khong? Team minh dang can Duelist.",
    },
  });

  await prisma.matchRequest.upsert({
    where: { id: "seed-request-minh-to-phoenix" },
    update: {},
    create: {
      id: "seed-request-minh-to-phoenix",
      senderId: minh.id,
      teamId: phoenix.id,
      type: "PLAYER_TO_TEAM",
      status: "ACCEPTED",
      message: "Minh muon apply vao team Phoenix Rising.",
    },
  });

  await prisma.matchRequest.upsert({
    where: { id: "seed-request-hieu-to-minh" },
    update: {},
    create: {
      id: "seed-request-hieu-to-minh",
      senderId: hieu.id,
      receiverId: minh.id,
      type: "PLAYER_TO_PLAYER",
      status: "DECLINED",
      message: "Toi nay duo Valorant khong?",
    },
  });

  const conversation = await prisma.conversation.upsert({
    where: { matchRequestId: "seed-request-minh-to-phoenix" },
    update: {},
    create: { id: "seed-conversation-phoenix", matchRequestId: "seed-request-minh-to-phoenix" },
  });

  for (const userId of [minh.id, khoa.id]) {
    await prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId: conversation.id, userId } },
      update: {},
      create: { conversationId: conversation.id, userId },
    });
  }

  await prisma.message.upsert({
    where: { id: "seed-message-1" },
    update: {},
    create: {
      id: "seed-message-1",
      conversationId: conversation.id,
      senderId: khoa.id,
      content: "Ok, toi nay 9h tap nhe!",
    },
  });

  await prisma.reputationRecord.upsert({
    where: { id: "seed-reputation-minh" },
    update: {},
    create: {
      id: "seed-reputation-minh",
      userId: minh.id,
      type: "seed_positive",
      points: 10,
      note: "Seed beta verified profile.",
    },
  });

  console.log("Seed complete");
  console.log("Login users: minh@fpt.edu.vn, admin@fpt-esporthub.local");
  console.log("Password: Password123!");
  void admin;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
