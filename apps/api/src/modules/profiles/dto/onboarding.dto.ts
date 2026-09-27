import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from "class-validator";
import {
  PLAY_MODE_IDS,
  communicationStyles,
  gameRanks,
  gameRoles,
  isAramOnly,
  playerGoals,
  scheduleSlots,
  supportedGames,
  supportsAram,
} from "../../lookups/lookup-data";
import { QuestionnaireDto } from "./questionnaire.dto";

const GAME_IDS = supportedGames.map((game) => game.id);
const GOAL_IDS = playerGoals.map((goal) => goal.id);
const STYLE_IDS = communicationStyles.map((style) => style.id);
const SLOT_IDS = scheduleSlots.map((slot) => slot.id);

/** Riot ID: game name (3-16 chars, no '#') + '#' + tagline (3-5 letters/digits). */
const RIOT_ID_PATTERN = /^[^#]{3,16}#[A-Za-z0-9]{3,5}$/;

function findRole(game: string, value: string) {
  const needle = value.trim().toLowerCase();
  return gameRoles[game]?.find((role) => role.id === needle || role.label.toLowerCase() === needle);
}

/** Role must exist for the chosen game (id or label accepted). */
@ValidatorConstraint({ name: "roleForGame" })
class RoleForGame implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments) {
    const { game } = args.object as OnboardingDto;
    return typeof value === "string" && Boolean(findRole(game, value));
  }

  defaultMessage() {
    return "role is not valid for this game";
  }
}

/** rankTier + rankLevel must match one entry of the game's rank ladder. */
@ValidatorConstraint({ name: "rankForGame" })
class RankForGame implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments) {
    const { game, rankLevel } = args.object as OnboardingDto;
    const level = rankLevel ?? null;
    return Boolean(gameRanks[game]?.some((rank) => rank.tier === value && rank.level === level));
  }

  defaultMessage() {
    return "rankTier/rankLevel is not valid for this game";
  }
}

/** ARAM-only LoL profiles don't need a rank or role (stored as Unranked / Fill). */
const skipsRankAndRole = (dto: OnboardingDto) => isAramOnly(dto.playModes) && supportsAram(dto.game);

const emptyToUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

export class OnboardingDto {
  @IsString()
  @IsIn(GAME_IDS)
  game!: string;

  /** LoL only: any of "ranked", "aram" (default ["ranked"]). Valorant is stored as ["ranked"]. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(PLAY_MODE_IDS, { each: true })
  playModes?: string[];

  /** Not required for ARAM-only LoL profiles; those are stored as Unranked. */
  @ValidateIf((dto: OnboardingDto) => !skipsRankAndRole(dto) || dto.rankTier !== undefined)
  @IsString()
  @Validate(RankForGame)
  rankTier?: string;

  @IsOptional()
  @IsInt()
  rankLevel?: number;

  /** Stored as the lookup label (e.g. "Duelist"), matching seed data and team neededRoles. ARAM-only: Fill. */
  @Transform(({ value, obj }) => (typeof value === "string" ? (findRole(obj.game, value)?.label ?? value) : value))
  @ValidateIf((dto: OnboardingDto) => !skipsRankAndRole(dto) || dto.role !== undefined)
  @IsString()
  @Validate(RoleForGame)
  role?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(SLOT_IDS, { each: true })
  schedule!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsIn(GOAL_IDS, { each: true })
  goals!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsIn(STYLE_IDS, { each: true })
  communicationStyles!: string[];

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @Matches(RIOT_ID_PATTERN, { message: "riotId must look like Name#TAG" })
  riotId?: string;

  /** Omitted: stored answers stay as they are. Sent (even empty): replaces them. */
  @IsOptional()
  @ValidateNested()
  @Type(() => QuestionnaireDto)
  questionnaire?: QuestionnaireDto;
}
