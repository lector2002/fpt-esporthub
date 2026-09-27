import type { GameId } from "@fpt-esporthub/database";

/** Roster cap per game, captain included. Accepting past this returns 409. */
export const MAX_TEAM_MEMBERS: Record<GameId, number> = {
  VALORANT: 5,
  LEAGUE_OF_LEGENDS: 5,
};

export const MAX_MESSAGE_LENGTH = 280;
