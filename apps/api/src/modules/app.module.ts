import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
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
    MatchingModule,
    MatchRequestsModule,
    ConversationsModule,
    TournamentsModule,
    ReportsModule,
    BlocksModule,
    ReputationModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
