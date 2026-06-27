import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ConversationsService } from "./conversations.service";
import { SendMessageDto } from "./dto/send-message.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("conversations")
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req: { user: { id: string } }) {
    return this.conversationsService.findAll(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  findOne(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.conversationsService.findOne(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/messages")
  sendMessage(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversationsService.sendMessage(id, req.user.id, dto.content);
  }
}
