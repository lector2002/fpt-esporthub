import { Module } from "@nestjs/common";
import { DdragonService } from "./ddragon.service";
import { RiotClientService } from "./riot-client.service";
import { RiotStatsService } from "./riot-stats.service";
import { RiotController } from "./riot.controller";
import { RiotService } from "./riot.service";

// PrismaService comes from the global PrismaModule.
@Module({
  controllers: [RiotController],
  providers: [RiotService, RiotStatsService, RiotClientService, DdragonService],
  exports: [RiotService],
})
export class RiotModule {}
