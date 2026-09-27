import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
} from "@nestjs/common";
import { ConversationsService } from "./conversations.service";
import { SendMessageDto } from "./dto/send-message.dto";
import { ListMessagesDto } from "./dto/list-messages.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("conversations")
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  findAll(@Request() req: { user: { id: string } }) {
    return this.conversationsService.findAll(req.user.id);
  }

  @Get(":id")
  findOne(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
    @Query() query: ListMessagesDto,
  ) {
    return this.conversationsService.findOne(id, req.user.id, query);
  }

  @Post(":id/messages")
  sendMessage(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversationsService.sendMessage(id, req.user.id, dto.content);
  }

  @Post(":id/read")
  @HttpCode(200)
  markRead(@Request() req: { user: { id: string } }, @Param("id") id: string) {
    return this.conversationsService.markRead(id, req.user.id);
  }
}
