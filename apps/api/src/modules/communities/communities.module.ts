import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module";
import { AdminCommunitiesService } from "./admin-communities.service";
import { AdminCommunitiesController, CommunitiesController } from "./communities.controller";
import { CommunitiesService } from "./communities.service";

@Module({
  imports: [MediaModule],
  controllers: [CommunitiesController, AdminCommunitiesController],
  providers: [CommunitiesService, AdminCommunitiesService],
})
export class CommunitiesModule {}
