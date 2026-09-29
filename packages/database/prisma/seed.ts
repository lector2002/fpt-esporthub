import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const passwordHash = "$2b$10$E9jL/I8KCgGKzP.Jd3XL0eEHAT5zEkLuyyFWsp7rcprs3eY3/wF1a"; // Password123!

async function upsertUser(id: string, email: string, displayName: string, role: "USER" | "ADMIN" = "USER") {
  return prisma.user.upsert({
    where: { email },
    update: { displayName, role, passwordHash },
    create: { id, email, displayName, role, passwordHash, emailVerifiedAt: new Date() },
  });
}

async function main() {
  const admin = await upsertUser("seed-admin", "admin@fpt-esporthub.local", "Admin", "ADMIN");
  const minh = await upsertUser("seed-user-minh", "minh@fpt.edu.vn", "MinhNguyen");
  const khoa = await upsertUser("seed-user-khoa", "khoa@fpt.edu.vn", "KhoaSentinel");
  const hieu = await upsertUser("seed-user-hieu", "hieu@fpt.edu.vn", "HieuSniper");
  const anhtu = await upsertUser("seed-user-anhtu", "anhtu@fpt.edu.vn", "AnhTuSupport");
  const linh = await upsertUser("seed-user-linh", "linh@fpt.edu.vn", "LinhMid");

  const profiles: Array<[string, "VALORANT" | "LEAGUE_OF_LEGENDS", Omit<Prisma.PlayerProfileUncheckedCreateInput, "userId" | "game">]> = [
    [minh.id, "VALORANT", { rankTier: "Gold", rankLevel: 2, role: "Duelist", schedule: ["weekday_evening", "weekend"], goals: ["rank_climb", "find_team"], communicationStyles: ["try_hard", "shotcaller"], riotId: "MinhNguyen#VN2", verificationStatus: "SELF_REPORTED", bio: "Sinh vien FPT, main Duelist, muon leo rank.", onboardingComplete: true }],
    [minh.id, "LEAGUE_OF_LEGENDS", { rankTier: "Silver", rankLevel: 1, role: "Jungle", schedule: ["weekend"], goals: ["casual_play", "find_team"], communicationStyles: ["chill", "shotcaller"], riotId: "MinhNguyen#VN2", verificationStatus: "SELF_REPORTED", bio: "Choi Jungle cuoi tuan cho vui.", voiceChat: "sometimes", lossReaction: "calm", mains: ["LeeSin", "Viego"], questionnaireAt: new Date("2026-09-20T12:00:00Z"), onboardingComplete: true }],
    [khoa.id, "VALORANT", { rankTier: "Diamond", rankLevel: 1, role: "Sentinel", schedule: ["weekday_evening", "weekend"], goals: ["rank_climb", "scrim_practice"], communicationStyles: ["try_hard", "shotcaller"], riotId: "Khoa#1011", verificationStatus: "SELF_REPORTED", bio: "Sentinel, call tot, dang tuyen team nghiem tuc.", onboardingComplete: true }],
    [hieu.id, "VALORANT", { rankTier: "Silver", rankLevel: 3, role: "Initiator", schedule: ["weekday_evening"], goals: ["scrim_practice", "find_team"], communicationStyles: ["quiet_focus", "try_hard"], riotId: "HieuSniper#VN1", verificationStatus: "SELF_REPORTED", bio: "Initiator thich tap luyen co lich co dinh.", onboardingComplete: true }],
    [anhtu.id, "LEAGUE_OF_LEGENDS", { rankTier: "Platinum", rankLevel: 3, role: "Support", schedule: ["weekday_evening"], goals: ["rank_climb", "join_tournaments"], communicationStyles: ["shotcaller", "beginner_friendly"], riotId: "AnhTu#VN1", verificationStatus: "SELF_REPORTED", bio: "Support main, uu tien leo rank va di giai.", onboardingComplete: true }],
    [linh.id, "LEAGUE_OF_LEGENDS", { rankTier: "Gold", rankLevel: 1, role: "Mid", schedule: ["weekend"], goals: ["casual_play", "find_team"], communicationStyles: ["chill", "quiet_focus"], playModes: ["ranked", "aram"], verificationStatus: "UNVERIFIED", bio: "Mid main, tim nhom choi cuoi tuan.", voiceChat: "always", lossReaction: "frustrated", mains: ["Ahri"], questionnaireAt: new Date("2026-09-21T12:00:00Z"), onboardingComplete: true }],
  ];
  for (const [userId, game, data] of profiles) {
    await prisma.playerProfile.upsert({
      where: { userId_game: { userId, game } },
      // Only play modes and questionnaire answers are re-applied, so existing databases pick up the newer demo data.
      update: {
        ...(data.playModes ? { playModes: data.playModes } : {}),
        ...(data.questionnaireAt ? { voiceChat: data.voiceChat, lossReaction: data.lossReaction, mains: data.mains, questionnaireAt: data.questionnaireAt } : {}),
      },
      create: { userId, game, ...data },
    });
  }

  // Same campus for the two LoL demo players, so "Same campus" shows up as a match reason.
  await prisma.user.update({ where: { id: minh.id }, data: { ageRange: "18_21", campus: "hanoi" } });
  await prisma.user.update({ where: { id: linh.id }, data: { ageRange: "18_21", campus: "hanoi" } });

  // Badges are earned (Riot verification, accepted matches, sessions), so seeded users start at NEW.
  await prisma.user.updateMany({ where: { id: { in: [minh.id, khoa.id, anhtu.id] } }, data: { reputationBadge: "NEW" } });

  await prisma.coachProfile.upsert({
    where: { userId: khoa.id },
    update: {
      game: "VALORANT",
      specialties: ["Sentinel setup", "VOD review", "Shotcalling"],
      hourlyRate: 180000,
      bio: "Coach Valorant cho người chơi muốn cải thiện game sense, setup site và giao tiếp trong đội.",
      availability: ["Tối T3", "Tối T5", "Cuối tuần"],
      active: true,
      reviewStatus: "APPROVED",
    },
    create: {
      reviewStatus: "APPROVED",
      reviewedAt: new Date(),
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
      reviewStatus: "APPROVED",
    },
    create: {
      reviewStatus: "APPROVED",
      reviewedAt: new Date(),
      userId: anhtu.id,
      game: "LEAGUE_OF_LEGENDS",
      specialties: ["Support macro", "Vision control", "Rank climbing"],
      hourlyRate: 150000,
      bio: "Coach LoL tập trung vào macro, kiểm soát tầm nhìn và cách phối hợp bot lane hiệu quả.",
      availability: ["Tối T2", "Tối T6", "Chiều Chủ nhật"],
    },
  });

  // Past agreed sessions so the seeded reviews below correspond to real completed sessions.
  async function seedPastSession(id: string, coachUserId: string, playerId: string, startsAt: string, price: number) {
    const coach = await prisma.coachProfile.findUniqueOrThrow({ where: { userId: coachUserId } });
    await prisma.coachingRequest.upsert({
      where: { id },
      update: {},
      create: {
        id,
        coachId: coach.id,
        playerId,
        proposedStartAt: new Date(startsAt),
        durationMinutes: 60,
        proposedPrice: price,
        message: "VOD review",
        status: "AGREED",
        lastProposedById: coachUserId,
      },
    });
  }
  await seedPastSession("seed-coaching-khoa-minh", khoa.id, minh.id, "2026-09-05T13:00:00.000Z", 180000);
  await seedPastSession("seed-coaching-khoa-hieu", khoa.id, hieu.id, "2026-09-12T13:00:00.000Z", 180000);
  await seedPastSession("seed-coaching-anhtu-linh", anhtu.id, linh.id, "2026-09-14T09:00:00.000Z", 150000);

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

  // ARAM teams store the full ladder and no needed roles; matching ignores both.
  const aramTeam = await prisma.team.upsert({
    where: { id: "seed-team-aram-weekend" },
    update: {},
    create: {
      id: "seed-team-aram-weekend",
      captainId: linh.id,
      name: "Weekend ARAM",
      game: "LEAGUE_OF_LEGENDS",
      mode: "aram",
      rankMin: "Unranked",
      rankMax: "Challenger",
      neededRoles: [],
      schedule: ["weekend", "late_night"],
      goals: ["casual_play"],
      communicationStyle: "chill",
      description: "Nhom ARAM cuoi tuan, choi vui, khong can rank.",
      recruitmentOpen: true,
    },
  });

  for (const [teamId, userId, role] of [
    [phoenix.id, khoa.id, "captain"],
    [nightOwls.id, hieu.id, "captain"],
    [dragon.id, anhtu.id, "captain"],
    [aramTeam.id, linh.id, "captain"],
  ] as const) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId } },
      update: { role },
      create: { teamId, userId, role },
    });
    // Team room chat mirrors the roster (apps/api teams/team-chat.ts).
    const room = await prisma.conversation.upsert({ where: { teamId }, update: {}, create: { teamId } });
    await prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId: room.id, userId } },
      update: {},
      create: { conversationId: room.id, userId, lastReadAt: new Date() },
    });
  }

  await seedCommunities([minh.id, khoa.id, hieu.id, anhtu.id, linh.id]);

  await prisma.tournamentEvent.upsert({
    where: { id: "seed-event-valorant-1" },
    update: {},
    create: {
      id: "seed-event-valorant-1",
      title: "FPT Valorant Beta Cup",
      game: "VALORANT",
      organizer: "FPT EsportHub",
      startsAt: new Date("2026-11-14T12:00:00.000Z"),
      deadlineAt: new Date("2026-11-07T12:00:00.000Z"),
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
      startsAt: new Date("2026-12-05T12:00:00.000Z"),
      deadlineAt: new Date("2026-11-28T12:00:00.000Z"),
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
      game: "VALORANT",
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
      game: "VALORANT",
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
      game: "VALORANT",
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

  // Offline tournaments: an approved demo venue with one upcoming LoL cup. The owner plays too, so the app shell opens normally.
  const venueOwner = await upsertUser("seed-user-venue", "venue@fpt-esporthub.local", "CyberCoreHoaLac");
  await prisma.playerProfile.upsert({
    where: { userId_game: { userId: venueOwner.id, game: "LEAGUE_OF_LEGENDS" } },
    update: {},
    create: { userId: venueOwner.id, game: "LEAGUE_OF_LEGENDS", rankTier: "Silver", rankLevel: 2, role: "Top", schedule: ["weekend"], goals: ["join_tournaments"], communicationStyles: ["chill"], verificationStatus: "UNVERIFIED", onboardingComplete: true },
  });
  const venue = await prisma.venue.upsert({
    where: { ownerId: venueOwner.id },
    update: {},
    create: { id: "seed-venue-cybercore", ownerId: venueOwner.id, name: "CyberCore Hoa Lac", address: "Khu CNC Hoa Lac, Thach That", city: "Hanoi", pcCount: 80, status: "APPROVED", reviewedAt: new Date() },
  });
  const cupStart = new Date(Date.now() + 7 * 86_400_000);
  cupStart.setHours(19, 0, 0, 0);
  await prisma.tournament.upsert({
    where: { id: "seed-offline-cup" },
    update: {},
    create: {
      id: "seed-offline-cup",
      venueId: venue.id,
      title: "CyberCore LoL Cup",
      game: "LEAGUE_OF_LEGENDS",
      format: "SINGLE_ELIMINATION",
      teamSize: 5,
      maxTeams: 8,
      bestOf: 1,
      finalBestOf: 3,
      entryFee: 250000,
      prize: "2.000.000 VND + gio choi mien phi",
      rules: "5v5 Summoner's Rift, tournament draft. Co mat tai quan truoc 18:30 de check-in.",
      startsAt: cupStart,
    },
  });

  console.log("Seed complete");
  console.log("Login users: minh@fpt.edu.vn, venue@fpt-esporthub.local (venue host), admin@fpt-esporthub.local");
  console.log("Password: Password123!");
  void admin;
}

/** Discord-style communities. Text channel chats mirror the members (apps/api communities/community-chat.ts). */
async function seedCommunities([minh, khoa, hieu, anhtu, linh]: string[]) {
  // Any other accounts in the database fill the member lists; none on a fresh install.
  const others = await prisma.user.findMany({
    where: { id: { notIn: [minh, khoa, hieu, anhtu, linh] }, role: "USER" },
    orderBy: { createdAt: "asc" },
    take: 40,
    select: { id: true },
  });
  const extra = others.map((user) => user.id);
  const communities = [
    {
      id: "seed-community-valorant",
      ownerId: khoa,
      name: "FPT Valorant Hub",
      description: "Cộng đồng Valorant của sinh viên FPT. Tìm đồng đội, leo rank, xem giải cùng nhau.",
      game: "VALORANT" as const,
      members: [minh, hieu, linh, ...extra.slice(0, 24)],
      channels: [
        { key: "chung", name: "chung", kind: "TEXT" as const },
        { key: "lfg", name: "tìm-đồng-đội", kind: "TEXT" as const },
        { key: "clips", name: "clip-highlight", kind: "TEXT" as const },
        { key: "lobby", name: "Sảnh chờ", kind: "VOICE" as const },
        { key: "ranked", name: "Leo rank", kind: "VOICE" as const },
        { key: "scrim", name: "Scrim 5v5", kind: "VOICE" as const },
      ],
      messages: [
        [khoa, "Chào mọi người, đây là chỗ tụ tập của team Valorant FPT. Ai cần tìm duo cứ vào #tìm-đồng-đội nhé."],
        [minh, "Tối nay có ai leo rank Gold không? Mình main Duelist."],
        [hieu, "Mình Sentinel, 9h tối vào phòng Leo rank nha."],
      ] as const,
    },
    {
      id: "seed-community-lol",
      ownerId: anhtu,
      name: "LMHT Hà Nội",
      description: "Hội Liên Minh Huyền Thoại khu Hà Nội. ARAM cuối tuần, flex tối thứ 6, offline ở quán net.",
      game: "LEAGUE_OF_LEGENDS" as const,
      members: [minh, linh, khoa, ...extra.slice(12, 32)],
      channels: [
        { key: "chung", name: "chung", kind: "TEXT" as const },
        { key: "lfg", name: "tìm-đồng-đội", kind: "TEXT" as const },
        { key: "builds", name: "build-và-meta", kind: "TEXT" as const },
        { key: "lobby", name: "Sảnh chờ", kind: "VOICE" as const },
        { key: "aram", name: "ARAM chill", kind: "VOICE" as const },
      ],
      messages: [
        [anhtu, "Welcome! Cuối tuần này có ai đi offline ở CyberCore không?"],
        [linh, "Mình đi, đang tìm thêm 1 jungle cho team flex."],
        [minh, "Mình jungle đây, main Lee Sin với Viego."],
      ] as const,
    },
    {
      id: "seed-community-fpt",
      ownerId: linh,
      name: "Sinh viên FPT Gaming",
      description: "Chơi gì cũng được: Valorant, LMHT hay game mới ra. Nói chuyện, tìm bạn chơi, chia sẻ lịch giải.",
      game: null,
      members: [minh, khoa, hieu, anhtu, ...extra.slice(20, 40)],
      channels: [
        { key: "chung", name: "chung", kind: "TEXT" as const },
        { key: "events", name: "lịch-giải", kind: "TEXT" as const },
        { key: "lobby", name: "Phòng chung", kind: "VOICE" as const },
        { key: "study", name: "Học bài cùng nhau", kind: "VOICE" as const },
      ],
      messages: [
        [linh, "Server chung cho mọi game nhé. Lịch giải mới sẽ ghim ở #lịch-giải."],
        [hieu, "Có ai thử game mới ra tuần này chưa?"],
      ] as const,
    },
  ];

  for (const community of communities) {
    const { id, members, channels, messages, ...data } = community;
    await prisma.community.upsert({ where: { id }, update: {}, create: { id, ...data } });
    const roster = [...new Set([data.ownerId, ...members])];
    await prisma.communityMember.createMany({
      data: roster.map((userId) => ({ communityId: id, userId, role: userId === data.ownerId ? "owner" : "member" })),
      skipDuplicates: true,
    });
    for (const [position, channel] of channels.entries()) {
      const channelId = `${id}-${channel.key}`;
      await prisma.communityChannel.upsert({
        where: { id: channelId },
        update: {},
        create: { id: channelId, communityId: id, name: channel.name, kind: channel.kind, position },
      });
      if (channel.kind !== "TEXT") continue;
      const conversation = await prisma.conversation.upsert({ where: { channelId }, update: {}, create: { channelId } });
      await prisma.conversationParticipant.createMany({
        data: roster.map((userId) => ({ conversationId: conversation.id, userId, lastReadAt: new Date() })),
        skipDuplicates: true,
      });
      if (channel.key !== "chung" || (await prisma.message.count({ where: { conversationId: conversation.id } })) > 0) continue;
      for (const [index, [senderId, content]] of messages.entries()) {
        await prisma.message.create({
          data: { conversationId: conversation.id, senderId, content, createdAt: new Date(Date.now() - (messages.length - index) * 7 * 60_000) },
        });
      }
    }
  }
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
