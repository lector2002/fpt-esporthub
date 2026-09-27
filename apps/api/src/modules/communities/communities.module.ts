import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module";
import { CommunitiesController } from "./communities.controller";
import { CommunitiesService } from "./communities.service";

@Module({
  imports: [MediaModule],
  controllers: [CommunitiesController],
  providers: [CommunitiesService],
})
export class CommunitiesModule {}
