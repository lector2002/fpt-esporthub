import { Controller, Get, Query, BadRequestException } from "@nestjs/common";
import {
  communicationStyles,
  playerGoals,
  supportedGames,
  gameRanks,
  gameRoles,
} from "./lookup-data";

@Controller("lookups")
export class LookupsController {
  @Get("games")
  getGames() {
    return { data: supportedGames };
  }

  @Get("goals")
  getGoals() {
    return { data: playerGoals };
  }

  @Get("communication-styles")
  getCommunicationStyles() {
    return { data: communicationStyles };
  }

  @Get("ranks")
  getRanks(@Query("game") game: string) {
    if (!game || !(game in gameRanks)) {
      throw new BadRequestException(
        `Missing or invalid game query param. Valid: ${Object.keys(gameRanks).join(", ")}`,
      );
    }
    return { data: gameRanks[game] };
  }

  @Get("roles")
  getRoles(@Query("game") game: string) {
    if (!game || !(game in gameRoles)) {
      throw new BadRequestException(
        `Missing or invalid game query param. Valid: ${Object.keys(gameRoles).join(", ")}`,
      );
    }
    return { data: gameRoles[game] };
  }
}
