import { Module } from "@nestjs/common";
import { MatchRequestsService } from "./match-requests.service";
import { MatchRequestsController } from "./match-requests.controller";

@Module({
  controllers: [MatchRequestsController],
  providers: [MatchRequestsService],
})
export class MatchRequestsModule {}
