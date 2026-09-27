import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module";
import { TeamsService } from "./teams.service";
import { TeamsController } from "./teams.controller";

@Module({
  imports: [MediaModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
