import { BadGatewayException, Injectable, Logger } from "@nestjs/common";

const DDRAGON = "https://ddragon.leagueoflegends.com";
const CACHE_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 8_000;

export function profileIconUrlFor(version: string, iconId: number) {
  return `${DDRAGON}/cdn/${version}/img/profileicon/${iconId}.png`;
}

/** Data Dragon (public static CDN, no API key). Caches the latest version in memory for 6h. */
@Injectable()
export class DdragonService {
  private readonly logger = new Logger(DdragonService.name);
  private cached: { version: string; fetchedAt: number } | null = null;

  /** Latest version, a stale cached one if the CDN is down, or null when none was ever fetched. */
  async latestVersion(): Promise<string | null> {
    if (this.cached && Date.now() - this.cached.fetchedAt < CACHE_MS) return this.cached.version;
    try {
      const response = await fetch(`${DDRAGON}/api/versions.json`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const [version] = (await response.json()) as string[];
      if (typeof version !== "string") throw new Error("empty version list");
      this.cached = { version, fetchedAt: Date.now() };
    } catch (error) {
      this.logger.warn(`Data Dragon version lookup failed: ${(error as Error).message}`);
    }
    return this.cached?.version ?? null;
  }

  async profileIconUrl(iconId: number) {
    const version = await this.latestVersion();
    if (!version) throw new BadGatewayException("League of Legends assets are unavailable right now");
    return profileIconUrlFor(version, iconId);
  }
}
