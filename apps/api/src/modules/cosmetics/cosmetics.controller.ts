import { Body, Controller, Get, Param, Post, Put, Request, UseGuards } from "@nestjs/common";
import { IsIn, IsOptional, IsString, Length } from "class-validator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { COSMETIC_KINDS, type CosmeticKind } from "./catalog";
import { CosmeticsService } from "./cosmetics.service";

type AuthedRequest = { user: { id: string } };

class EquipCosmeticDto {
  @IsIn(COSMETIC_KINDS)
  kind!: CosmeticKind;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  itemId?: string | null;
}

@Controller("cosmetics")
@UseGuards(JwtAuthGuard)
export class CosmeticsController {
  constructor(private cosmetics: CosmeticsService) {}

  @Get("me")
  mine(@Request() req: AuthedRequest) {
    return this.cosmetics.getMine(req.user.id);
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
