import { BadRequestException } from "@nestjs/common";
import type { GameId } from "@fpt-esporthub/database";
import type { PrismaService } from "../modules/prisma/prisma.service";

export const GAME_MAP: Record<string, GameId> = {
  valorant: "VALORANT",
  league_of_legends: "LEAGUE_OF_LEGENDS",
};

export function toGameSlug(game: GameId) {
  return game === "VALORANT" ? "valorant" : "league_of_legends";
}

export function parseGame(value: string | undefined): GameId | undefined {
  if (!value) return undefined;
  const game = GAME_MAP[value];
  if (!game) throw new BadRequestException(`Unknown game: ${value}`);
  return game;
}

/** The profile for the requested game, or the user's first profile when no game is given. */
export function findActiveProfile(prisma: PrismaService, userId: string, game: GameId | undefined) {
  return game
    ? prisma.playerProfile.findUnique({ where: { userId_game: { userId, game } } })
    : prisma.playerProfile.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
}
