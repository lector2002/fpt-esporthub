import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { MatchRequestsService } from "./match-requests.service";
import { CreateMatchRequestDto } from "./dto/create-match-request.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("match/requests")
export class MatchRequestsController {
  constructor(private matchRequestsService: MatchRequestsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateMatchRequestDto,
  ) {
    return this.matchRequestsService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Request() req: { user: { id: string } },
    @Query("direction") direction?: string,
  ) {
    return this.matchRequestsService.findAll(req.user.id, direction);
  }

  @UseGuards(JwtAuthGuard)
  @Put(":id/accept")
  accept(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.matchRequestsService.accept(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(":id/decline")
  decline(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.matchRequestsService.decline(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(":id/cancel")
  cancel(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.matchRequestsService.cancel(id, req.user.id);
  }
}
