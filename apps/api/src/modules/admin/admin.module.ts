import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { ReputationModule } from "../reputation/reputation.module";

@Module({
  imports: [ReputationModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
