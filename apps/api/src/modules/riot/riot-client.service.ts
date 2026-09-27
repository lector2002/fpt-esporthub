import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { RateLimitBusyError, RateLimiter } from "./rate-limiter";
import type { LolLeagueEntry, LolMatch, LolSummoner, RiotAccount } from "./riot-types";

const TIMEOUT_MS = 8_000;
/** Longest `Retry-After` worth waiting for inside a single API request. */
const MAX_RETRY_AFTER_SECONDS = 10;

type RoutingKey = "platform" | "match" | "account";

const ROUTING_ENV: Record<RoutingKey, { env: string; fallback: string }> = {
  platform: { env: "RIOT_PLATFORM", fallback: "vn2" },
  match: { env: "RIOT_MATCH_REGION", fallback: "sea" },
  account: { env: "RIOT_ACCOUNT_REGION", fallback: "asia" },
};

function routingHost(key: RoutingKey) {
  const { env, fallback } = ROUTING_ENV[key];
  const value = (process.env[env] ?? fallback).trim().toLowerCase();
  const safe = /^[a-z0-9]+$/.test(value) ? value : fallback;
  return `https://${safe}.api.riotgames.com`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Thin `fetch` wrapper for the Riot API: auth header, timeout, rate limiting, error mapping. */
@Injectable()
export class RiotClientService {
  private readonly logger = new Logger(RiotClientService.name);
  private readonly limiter = new RateLimiter();

  getAccountByRiotId(gameName: string, tagLine: string) {
    const path = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    return this.get<RiotAccount>("account", path);
  }

  getAccountByPuuid(puuid: string) {
    return this.get<RiotAccount>("account", `/riot/account/v1/accounts/by-puuid/${encodeURIComponent(puuid)}`);
  }

  getSummonerByPuuid(puuid: string) {
    return this.get<LolSummoner>("platform", `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`);
  }

  getLeagueEntries(puuid: string) {
    return this.get<LolLeagueEntry[]>("platform", `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`);
  }

  /** Ranked games only (Solo/Duo and Flex on Summoner's Rift). */
  getRankedMatchIds(puuid: string, count: number) {
    const path = `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?type=ranked&start=0&count=${count}`;
    return this.get<string[]>("match", path);
  }

  getMatch(matchId: string) {
    return this.get<LolMatch>("match", `/lol/match/v5/matches/${encodeURIComponent(matchId)}`);
  }

  private async get<T>(routing: RoutingKey, path: string): Promise<T> {
    const apiKey = process.env.RIOT_API_KEY?.trim();
    if (!apiKey) throw new ServiceUnavailableException("Riot API is not configured");

    const url = `${routingHost(routing)}${path}`;
    let response = await this.send(url, apiKey);
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "1");
      if (!Number.isFinite(retryAfter) || retryAfter > MAX_RETRY_AFTER_SECONDS) throw this.busy();
      await sleep(Math.max(retryAfter, 1) * 1000);
      response = await this.send(url, apiKey);
    }
    if (response.ok) return (await response.json()) as T;
    throw this.mapError(response.status, routing);
  }

  private async send(url: string, apiKey: string) {
    try {
      await this.limiter.acquire();
    } catch (error) {
      if (error instanceof RateLimitBusyError) throw this.busy();
      throw error;
    }
    try {
      return await fetch(url, { headers: { "X-Riot-Token": apiKey }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      throw new BadGatewayException("Riot API did not respond");
    }
  }

  private busy() {
    return new ServiceUnavailableException("Riot API is busy, try again in a minute");
  }

  private mapError(status: number, routing: RoutingKey) {
    if (status === 401 || status === 403) {
      this.logger.warn(`Riot API rejected the key (status ${status}); it is missing, invalid or expired`);
      return new ServiceUnavailableException("Riot API key invalid or expired");
    }
    if (status === 404) return new NotFoundException("Riot account not found");
    if (status === 429) return this.busy();
    this.logger.warn(`Riot API ${routing} request failed with status ${status}`);
    return new BadGatewayException("Riot API is unavailable right now");
  }
}
