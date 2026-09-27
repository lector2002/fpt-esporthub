import type { BrowserContext, Page } from "@playwright/test";

export const API_URL = process.env.E2E_BASE_URL ? `${process.env.E2E_BASE_URL}/api/v1` : "http://localhost:4000/api/v1";
export const PASSWORD = "Password123!";
export const SEEDED_USER = { email: "minh@fpt.edu.vn", password: PASSWORD };
export const SEEDED_ADMIN = { email: "admin@fpt-esporthub.local", password: PASSWORD };

const TOKEN_KEY = "fpt-esporthub-token";
const LANGUAGE_KEY = "fpt-esporthub-language";
const GAME_KEY = "fpt-esporthub-game";

type GameSlug = "valorant" | "league_of_legends";

export interface TestUser {
  id: string;
  email: string;
  displayName: string;
  token: string;
}

/** Short unique tag for names; the timestamp keeps runs apart, the random tail keeps parallel workers apart. */
export function uniqueTag() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function uniqueEmail() {
  return `e2e+${Date.now()}${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export async function apiCall<T>(path: string, options: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  return (await response.json()) as T;
}

type AuthResponse = { accessToken: string; user: { id: string; email: string; displayName: string } };

export async function registerUser(prefix = "E2E"): Promise<TestUser> {
  const displayName = `${prefix} ${uniqueTag()}`;
  const { accessToken, user } = await apiCall<AuthResponse>("/auth/register", {
    method: "POST",
    body: { email: uniqueEmail(), password: PASSWORD, displayName },
  });
  return { id: user.id, email: user.email, displayName: user.displayName, token: accessToken };
}

export async function loginUser(email: string, password = PASSWORD): Promise<TestUser> {
  const { accessToken, user } = await apiCall<AuthResponse>("/auth/login", { method: "POST", body: { email, password } });
  return { id: user.id, email: user.email, displayName: user.displayName, token: accessToken };
}

const ONBOARDING_DEFAULTS: Record<GameSlug, { rankTier: string; rankLevel: number; role: string }> = {
  valorant: { rankTier: "Gold", rankLevel: 2, role: "Duelist" },
  league_of_legends: { rankTier: "Gold", rankLevel: 2, role: "Mid" },
};

/** Completes onboarding for one game. The API defaults `lookingStatus` to `open_to_match`, so the user is matchable. */
export async function onboard(user: TestUser, game: GameSlug) {
  await apiCall("/profiles/onboarding", {
    method: "POST",
    token: user.token,
    body: {
      game,
      ...ONBOARDING_DEFAULTS[game],
      schedule: ["weekday_evening", "weekend"],
      goals: ["rank_climb"],
      communicationStyles: ["chill"],
    },
  });
}

/** Registers a user and onboards them for each game, in order (the first becomes the default active game). */
export async function createPlayer(prefix: string, games: GameSlug[] = ["valorant"]) {
  const user = await registerUser(prefix);
  for (const game of games) await onboard(user, game);
  return user;
}

/** Forces the English UI for every page in the context. */
export async function setEnglish(context: BrowserContext) {
  await context.addInitScript((key) => window.localStorage.setItem(key, "en"), LANGUAGE_KEY);
}

/** Signs the page in by storing the token once per tab, so a later logout sticks. */
export async function signIn(page: Page, user: TestUser, game?: GameSlug) {
  await page.addInitScript(
    ({ tokenKey, token, gameKey, game }) => {
      if (window.sessionStorage.getItem("e2e-signed-in")) return;
      window.sessionStorage.setItem("e2e-signed-in", "1");
      window.localStorage.setItem(tokenKey, token);
      if (game) window.localStorage.setItem(gameKey, game);
    },
    { tokenKey: TOKEN_KEY, token: user.token, gameKey: GAME_KEY, game },
  );
}

/** Card on a list page that links to `name` (match cards, team cards...). */
export function cardFor(page: Page, name: string) {
  return page.locator('[data-slot="card"]').filter({ has: page.getByRole("link", { name, exact: true }) });
}

/** A Find Match card, found through the search box once results load (no paging through test users). */
export async function matchCardFor(page: Page, name: string) {
  await page.getByText(/^\d+ results$/).or(page.getByText("No matches yet")).waitFor();
  const search = page.getByRole("searchbox");
  if (await search.count()) await search.fill(name);
  return cardFor(page, name);
}

export function toast(page: Page, text: string | RegExp) {
  return page.locator("[data-sonner-toast]").filter({ hasText: text });
}
