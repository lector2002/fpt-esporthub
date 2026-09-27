import { Controller, Get, Header, Logger, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { resolveIceServers } from "./ice-servers";

@Controller("realtime")
@UseGuards(JwtAuthGuard)
export class RealtimeController {
  private readonly logger = new Logger(RealtimeController.name);

  /** ICE servers for voice calls. TURN credentials are per user and expire, so never cache. */
  @Get("ice-servers")
  @Header("Cache-Control", "no-store")
  iceServers(@Request() req: { user: { id: string } }) {
    return resolveIceServers(process.env, req.user.id, Date.now(), fetch, (message) => this.logger.warn(message));
  }
}
