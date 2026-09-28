import { Body, Controller, Get, Param, Post, Put, Request, UseGuards } from "@nestjs/common";
import { IsIn, IsOptional, IsString, Length } from "class-validator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { COSMETIC_KINDS, type CosmeticKind } from "./catalog";
import { CosmeticsService } from "./cosmetics.service";
import { GACHA_BANNERS, GACHA_BATCH } from "./gacha";

type AuthedRequest = { user: { id: string } };

class EquipCosmeticDto {
  @IsIn(COSMETIC_KINDS)
  kind!: CosmeticKind;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  itemId?: string | null;
}

class PullGachaDto {
  @IsOptional()
  @IsIn(GACHA_BANNERS.map((banner) => banner.id))
  banner?: string;

  @IsOptional()
  @IsIn([1, GACHA_BATCH])
  count?: number;
}

@Controller("cosmetics")
@UseGuards(JwtAuthGuard)
export class CosmeticsController {
  constructor(private cosmetics: CosmeticsService) {}

  @Get("me")
  mine(@Request() req: AuthedRequest) {
    return this.cosmetics.getMine(req.user.id);
  }

  @Post("gacha/pull")
  pull(@Request() req: AuthedRequest, @Body() dto: PullGachaDto) {
    return this.cosmetics.pull(req.user.id, dto.banner ?? "standard", dto.count ?? 1);
  }

  @Post(":itemId/buy")
  buy(@Request() req: AuthedRequest, @Param("itemId") itemId: string) {
    return this.cosmetics.buy(req.user.id, itemId);
  }

  @Put("equipped")
  equip(@Request() req: AuthedRequest, @Body() dto: EquipCosmeticDto) {
    return this.cosmetics.equip(req.user.id, dto.kind, dto.itemId ?? null);
  }
}
