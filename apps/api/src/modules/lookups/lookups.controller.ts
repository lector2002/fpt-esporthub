import { Controller, Get, Query, BadRequestException } from "@nestjs/common";
import {
  communicationStyles,
  playerGoals,
  scheduleSlots,
  supportedGames,
  gameRanks,
  gameRoles,
  gamePlayModes,
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

  @Get("schedule-slots")
  getScheduleSlots() {
    return { data: scheduleSlots };
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

  @Get("play-modes")
  getPlayModes(@Query("game") game: string) {
    if (!game || !(game in gamePlayModes)) {
      throw new BadRequestException(
        `Missing or invalid game query param. Valid: ${Object.keys(gamePlayModes).join(", ")}`,
      );
    }
    return { data: gamePlayModes[game] };
  }
}
