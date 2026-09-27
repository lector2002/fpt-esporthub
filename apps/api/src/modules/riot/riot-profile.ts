import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { GameId } from "@fpt-esporthub/database";
import { findActiveProfile, parseGame } from "../../common/game";
import type { PrismaService } from "../prisma/prisma.service";

/** Valorant personal data needs Riot Sign-On and a production key; these endpoints never call Riot for it. */
export const REQUIRES_RSO = { status: "requires_rso" } as const;

export const LOL: GameId = "LEAGUE_OF_LEGENDS";

type VerificationFields = {
  verificationStatus: string;
  riotPuuid: string | null;
};

/** Riot endpoints are always game-scoped; never fall back to the user's first profile. */
export function requireGame(value: string | undefined): GameId {
  const game = parseGame(value);
  if (!game) throw new BadRequestException("game is required");
  return game;
}

export async function requireProfile(prisma: PrismaService, userId: string, game: GameId) {
  const profile = await findActiveProfile(prisma, userId, game);
  if (!profile) throw new NotFoundException("Profile not found. Complete onboarding first.");
  return profile;
}

/** Legacy profiles marked VERIFIED without a puuid never passed the icon challenge, so they don't count. */
export function isRiotVerified(profile: VerificationFields) {
  return profile.verificationStatus === "VERIFIED" && Boolean(profile.riotPuuid);
}

/** Picked from a lookup (LINKED) or proven by the icon challenge (VERIFIED): real rank and stats either way. */
export function isRiotLinked(profile: VerificationFields) {
  return (profile.verificationStatus === "LINKED" || profile.verificationStatus === "VERIFIED") && Boolean(profile.riotPuuid);
}

/** Splits `Name#TAG` at the last `#` (game names may contain spaces). */
export function parseRiotId(riotId: string | null | undefined) {
  const index = riotId?.lastIndexOf("#") ?? -1;
  const gameName = riotId?.slice(0, index).trim() ?? "";
  const tagLine = riotId?.slice(index + 1).trim() ?? "";
  if (index < 0 || !gameName || !tagLine) {
    throw new BadRequestException("Riot ID must look like Name#TAG");
  }
  return { gameName, tagLine };
}
