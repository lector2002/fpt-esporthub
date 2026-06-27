import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { BlocksService } from "./blocks.service";
import { CreateBlockDto } from "./dto/create-block.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("blocks")
export class BlocksController {
  constructor(private blocksService: BlocksService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getMyBlocks(@Request() req: { user: { id: string } }) {
    return this.blocksService.getMyBlocks(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateBlockDto,
  ) {
    return this.blocksService.create(req.user.id, dto.blockedId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":userId")
  remove(
    @Request() req: { user: { id: string } },
    @Param("userId") userId: string,
  ) {
    return this.blocksService.remove(req.user.id, userId);
  }
}
