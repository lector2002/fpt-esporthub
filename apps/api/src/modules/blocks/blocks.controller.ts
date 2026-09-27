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
@UseGuards(JwtAuthGuard)
export class BlocksController {
  constructor(private blocksService: BlocksService) {}

  @Get()
  getMyBlocks(@Request() req: { user: { id: string } }) {
    return this.blocksService.getMyBlocks(req.user.id);
  }

  @Post()
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateBlockDto,
  ) {
    return this.blocksService.create(req.user.id, dto.userId);
  }

  @Delete(":userId")
  remove(
    @Request() req: { user: { id: string } },
    @Param("userId") userId: string,
  ) {
    return this.blocksService.remove(req.user.id, userId);
  }
}
