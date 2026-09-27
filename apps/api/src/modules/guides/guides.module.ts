import { Module } from "@nestjs/common";
import { CreditsModule } from "../credits/credits.module";
import { GuidesController } from "./guides.controller";
import { GuidesImportService } from "./guides-import.service";
import { GuidesService } from "./guides.service";

/** LoL build guides: free top build per section, premium pass (credits) unlocks every alternative. Refreshed from op.gg nightly. */
@Module({
  imports: [CreditsModule],
  controllers: [GuidesController],
  providers: [GuidesService, GuidesImportService],
})
export class GuidesModule {}
