import "../../env";
import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { CallService } from "./call.service";
import { RealtimeController } from "./realtime.controller";
import { RealtimeGateway } from "./realtime.gateway";
import { RealtimeService } from "./realtime.service";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET environment variable is required");
}

/** Socket.IO `/realtime` namespace (chat events + voice call signaling). Global so any module can inject `RealtimeService`. */
@Global()
@Module({
  imports: [JwtModule.register({ secret: jwtSecret })],
  controllers: [RealtimeController],
  providers: [RealtimeGateway, RealtimeService, CallService],
  exports: [RealtimeService, CallService],
})
export class RealtimeModule {}
