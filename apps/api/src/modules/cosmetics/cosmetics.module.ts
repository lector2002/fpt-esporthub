import { Module } from "@nestjs/common";
import { CreditsModule } from "../credits/credits.module";
import { CosmeticsController } from "./cosmetics.controller";
import { CosmeticsService } from "./cosmetics.service";

/** Profile cosmetics bought with credits: frames, banners, name colors, titles. */
@Module({
  imports: [CreditsModule],
  controllers: [CosmeticsController],
  providers: [CosmeticsService],
})
export class CosmeticsModule {}
