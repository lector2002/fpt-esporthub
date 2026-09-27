import { Controller, Post, Body, UseGuards, Request } from "@nestjs/common";
import { MatchingService } from "./matching.service";
import { FindMatchDto } from "./dto/find-match.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { parseGame } from "../../common/game";

@Controller("match")
export class MatchingController {
  constructor(private matchingService: MatchingService) {}

  @UseGuards(JwtAuthGuard)
  @Post("find")
  findMatches(
    @Request() req: { user: { id: string } },
    @Body() dto: FindMatchDto,
  ) {
    return this.matchingService.findMatches(req.user.id, dto.mode, parseGame(dto.game), dto.playMode);
  }
}
