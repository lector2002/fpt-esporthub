import { Module } from "@nestjs/common";
import { ProfilesService } from "./profiles.service";
import { ProfilesController } from "./profiles.controller";
import { MatchingModule } from "../matching/matching.module";
import { RiotModule } from "../riot/riot.module";

@Module({
  imports: [MatchingModule, RiotModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
})
export class ProfilesModule {}
