import { expect, test, type Page } from "@playwright/test";
import { SEEDED_USER, apiCall, loginUser, registerUser, setEnglish, signIn } from "./helpers";

const RIOT_ID = "Stub Player#VN2";

/** Riot (daily dev key) and Data Dragon (patch-dependent) are stubbed; the app API is real. */
async function stubExternal(page: Page) {
  const calls = { link: 0 };
  const ranked = { tier: "Gold", division: "II", leaguePoints: 40, wins: 30, losses: 25, winrate: 55 };
  await page.route(/\/api\/v1\/riot\/(stats|lookup|link|suggest)(\?|$)/, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/lookup")) {
      return route.fulfill({
        json: { status: "found", riotId: RIOT_ID, summonerLevel: 321, iconUrl: null, ranked: { solo: ranked, flex: null }, claim: "free" },
      });
    }
    if (url.pathname.endsWith("/link")) {
      calls.link += 1;
      return route.fulfill({ json: { status: "linked", riotId: RIOT_ID, synced: true } });
    }
    return route.fulfill({
      json: { status: "unlinked", riotId: null, syncedAt: null, nextSyncAt: null, stats: null, challenge: null, ddragonVersion: null },
    });
  });
  await page.route(/ddragon\.leagueoflegends\.com\/api\/versions\.json/, (route) => route.fulfill({ json: ["99.1.1"] }));
  await page.route(/ddragon\.leagueoflegends\.com\/cdn\/.*\/champion\.json/, (route) =>
    route.fulfill({ json: { data: { Ahri: { id: "Ahri", name: "Ahri" }, LeeSin: { id: "LeeSin", name: "Lee Sin" } } } }),
  );
  await page.route(/ddragon\.leagueoflegends\.com\/cdn\/.*\.png/, (route) => route.abort());
  return calls;
}

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("LoL onboarding links a searched Riot account, fills rank from it, saves the questionnaire and can retake it", async ({ page }) => {
  test.slow();
  const user = await registerUser("E2E Quiz");
  const calls = await stubExternal(page);
  await signIn(page, user);
  await page.goto("/onboarding");
  const next = page.getByRole("button", { name: "Continue" });

  await page.getByRole("radio", { name: "League of Legends" }).click();
  await next.click();
  await next.click();

  await expect(page.getByRole("heading", { name: "Link your Riot account" })).toBeVisible();
  await page.getByLabel("Riot ID").fill("stub player#vn2");
  await page.getByLabel("Riot ID").press("Enter");
  await page.getByRole("button", { name: "This is me" }).click();
  await expect(page.getByText("Links when you save your profile")).toBeVisible();
  await next.click();

  await expect(page.getByText("Rank taken from your Riot account.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Gold", exact: true })).toBeChecked();
  await page.getByRole("radio", { name: "Jungle" }).click();
  await next.click();

  await page.getByRole("button", { name: "Weekends" }).click();
  await page.getByRole("button", { name: "Rank climb" }).click();
  await page.getByRole("button", { name: "Chill" }).click();
  await next.click();

  await page.getByRole("radio", { name: "Always on mic" }).click();
  await page.getByPlaceholder("Search by name").fill("ahr");
  await page.getByRole("option", { name: "Ahri" }).click();
  await page.getByRole("radio", { name: "FPT Hanoi" }).click();
  await page.getByRole("radio", { name: "18-21" }).click();
  await next.click();

  const review = page.getByRole("heading", { name: "Review your details" }).locator("..");
  await expect(review).toContainText(`${RIOT_ID} · links on save`);
  await expect(review).toContainText("4 of 5 answered");
  await page.getByRole("button", { name: "Create profile" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(calls.link).toBe(1);

  const me = await apiCall<{
    user: { ageRange: string | null; campus: string | null };
    profile: { rankTier: string; rankLevel: number | null; voiceChat: string | null; mains: string[]; questionnaireAt: string | null };
  }>("/profiles/me?game=league_of_legends", { token: user.token });
  expect(me.user).toMatchObject({ ageRange: "18_21", campus: "hanoi" });
  expect(me.profile).toMatchObject({ rankTier: "Gold", rankLevel: 2, voiceChat: "always", mains: ["Ahri"] });
  expect(me.profile.questionnaireAt).not.toBeNull();

  // Other players see the campus but never the age range.
  const viewer = await loginUser(SEEDED_USER.email);
  const publicView = await apiCall<{ user: Record<string, unknown> }>(`/profiles/${user.id}`, { token: viewer.token });
  expect(publicView.user.campus).toBe("hanoi");
  expect(publicView.user).not.toHaveProperty("ageRange");

  await page.goto("/profile/me");
  const playstyle = page.locator("#playstyle");
  await expect(playstyle.getByText("Always on mic")).toBeVisible();
  await expect(playstyle.getByText("Only you")).toBeVisible();
  await playstyle.getByRole("link", { name: "Retake questionnaire" }).click();
  await expect(page).toHaveURL(/\/onboarding\?game=league_of_legends&step=questionnaire$/);
  await expect(page.getByRole("heading", { name: "How do you use voice chat?" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Always on mic" })).toBeChecked();
  await expect(page.getByRole("link", { name: "Exit" })).toHaveAttribute("href", "/profile/me");
});
