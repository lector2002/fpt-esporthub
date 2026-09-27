import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { ClientIpThrottlerGuard } from "../common/client-ip-throttler.guard";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { LookupsModule } from "./lookups/lookups.module";
import { AuthModule } from "./auth/auth.module";
import { ProfilesModule } from "./profiles/profiles.module";
import { TeamsModule } from "./teams/teams.module";
import { MatchingModule } from "./matching/matching.module";
import { MatchRequestsModule } from "./match-requests/match-requests.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { TournamentsModule } from "./tournaments/tournaments.module";
import { ReportsModule } from "./reports/reports.module";
import { BlocksModule } from "./blocks/blocks.module";
import { ReputationModule } from "./reputation/reputation.module";
import { AdminModule } from "./admin/admin.module";
import { CoachingModule } from "./coaching/coaching.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { RiotModule } from "./riot/riot.module";
import { OfflineTournamentsModule } from "./offline-tournaments/offline-tournaments.module";
import { MediaModule } from "./media/media.module";
import { CreditsModule } from "./credits/credits.module";
import { CosmeticsModule } from "./cosmetics/cosmetics.module";
import { GuidesModule } from "./guides/guides.module";
import { CommunitiesModule } from "./communities/communities.module";

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    HealthModule,
    LookupsModule,
    AuthModule,
    ProfilesModule,
    TeamsModule,
    CommunitiesModule,
    MatchingModule,
    MatchRequestsModule,
    ConversationsModule,
    TournamentsModule,
    ReportsModule,
    BlocksModule,
    ReputationModule,
    AdminModule,
    CoachingModule,
    RealtimeModule,
    RiotModule,
    OfflineTournamentsModule,
    MediaModule,
    CreditsModule,
    CosmeticsModule,
    GuidesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ClientIpThrottlerGuard,
    },
  ],
})
export class AppModule {}
