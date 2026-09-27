import { expect, test, type Page } from "@playwright/test";
import { createPlayer, setEnglish, signIn, toast } from "./helpers";

const RIOT_ID = "Stub Player#VN2";

/** Riot calls spend a daily dev key, so the Riot endpoints are stubbed; everything else hits the real API. */
async function stubRiot(page: Page) {
  let linked = false;
  const ranked = { tier: "Gold", division: "II", leaguePoints: 40, wins: 30, losses: 25, winrate: 55 };
  await page.route(/\/api\/v1\/riot\/(stats|lookup|link|suggest)(\?|$)/, async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const json = (body: unknown) => route.fulfill({ json: body });
    if (url.pathname.endsWith("/suggest")) {
      return json({ suggestions: [{ riotId: RIOT_ID, summonerLevel: 321, iconUrl: null, solo: ranked, source: "riot" }] });
    }
    if (url.pathname.endsWith("/lookup")) {
      return json({ status: "found", riotId: RIOT_ID, summonerLevel: 321, iconUrl: null, ranked: { solo: ranked, flex: null }, claim: "free" });
    }
    if (url.pathname.endsWith("/link")) {
      linked = method === "POST";
      return json(linked ? { status: "linked", riotId: RIOT_ID, synced: true } : { status: "unlinked" });
    }
    return json({
      status: linked ? "linked" : "unlinked",
      riotId: linked ? RIOT_ID : null,
      syncedAt: null,
      nextSyncAt: null,
      stats: null,
      challenge: null,
      ddragonVersion: null,
    });
  });
}

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("player searches a Riot ID, links it from the preview, then unlinks it", async ({ page }) => {
  const player = await createPlayer("E2E Riot", ["league_of_legends"]);
  await stubRiot(page);
  await signIn(page, player, "league_of_legends");
  await page.goto("/profile/me");

  const riot = page.locator("#riot");
  await riot.getByLabel("Riot ID").fill("no tag");
  await riot.getByRole("button", { name: "Search" }).click();
  await expect(riot.getByText("Riot ID must look like Name#TAG")).toBeVisible();

  await riot.getByLabel("Riot ID").fill("stub player");
  const suggestions = riot.getByRole("listbox", { name: "Is this you?" });
  await expect(suggestions.getByRole("option", { name: /Stub Player#VN2/ })).toContainText("Level 321 · Gold II");
  await suggestions.getByRole("option", { name: /Stub Player#VN2/ }).click();
  await expect(riot.getByText(RIOT_ID)).toBeVisible();
  await expect(riot.getByText("Gold II")).toBeVisible();

  await riot.getByRole("button", { name: "This is me" }).click();
  await expect(toast(page, "Riot account linked")).toBeVisible();
  await expect(riot.getByRole("status").filter({ hasText: `Linked ${RIOT_ID}` })).toBeVisible();
  await expect(riot.getByRole("button", { name: "Verify" })).toBeVisible();
  await expect(riot.getByText(/^Linked ·/)).toBeVisible();

  await riot.getByRole("button", { name: "Unlink" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Unlink" }).click();
  await expect(toast(page, "Riot account unlinked")).toBeVisible();
  await expect(riot.getByRole("button", { name: "Search" })).toBeVisible();
});
