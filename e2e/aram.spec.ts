import { expect, test, type Page } from "@playwright/test";
import { apiCall, matchCardFor, registerVerified, setEnglish, signIn, toast, uniqueTag, type TestUser } from "./helpers";

const LOL = "league_of_legends";

/** Fresh account for this spec (w9+ prefix keeps these test users identifiable). */
async function registerW9(prefix: string): Promise<TestUser> {
  const email = `w9+${Date.now()}${Math.random().toString(36).slice(2, 6)}@example.com`;
  return registerVerified(email, `${prefix} ${uniqueTag()}`);
}

/** ARAM-only LoL profile: no rank or role is sent, the API stores Unranked / Fill. */
async function createAramPlayer(prefix: string) {
  const user = await registerW9(prefix);
  await apiCall("/profiles/onboarding", {
    method: "POST",
    token: user.token,
    body: { game: LOL, playModes: ["aram"], schedule: ["weekend"], goals: ["casual_play"], communicationStyles: ["chill"] },
  });
  return user;
}

function matchResponse(page: Page, playMode: "ranked" | "aram") {
  return page.waitForResponse(
    (response) => response.url().endsWith("/match/find") && (response.request().postData() ?? "").includes(`"playMode":"${playMode}"`),
  );
}

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("ARAM-only players find each other in ARAM mode and not in Ranked mode", async ({ page }) => {
  test.slow();
  const [alice, bob] = await Promise.all([createAramPlayer("W9 Aram A"), createAramPlayer("W9 Aram B")]);
  await signIn(page, alice, LOL);

  // An ARAM-only profile opens Find Match in ARAM mode.
  const aramLoaded = matchResponse(page, "aram");
  await page.goto("/find-match");
  await aramLoaded;
  await expect(page.getByRole("radio", { name: "ARAM" })).toHaveAttribute("aria-checked", "true");
  const bobCard = await matchCardFor(page, bob.displayName);
  await expect(bobCard).toBeVisible();
  await expect(bobCard).not.toContainText("Unranked");

  const rankedLoaded = matchResponse(page, "ranked");
  await page.getByRole("radio", { name: "Ranked" }).click();
  await rankedLoaded;
  await expect(await matchCardFor(page, bob.displayName)).toHaveCount(0);
});

test("ARAM-only onboarding skips rank and role and stores Unranked / Fill", async ({ page }) => {
  test.slow();
  const user = await registerW9("W9 Onb");
  await signIn(page, user);
  await page.goto("/onboarding");
  const next = page.getByRole("button", { name: "Continue" });

  await page.getByRole("radio", { name: "League of Legends" }).click();
  await next.click();

  await expect(page.getByRole("heading", { name: "Which modes do you play?" })).toBeVisible();
  await page.getByRole("button", { name: "ARAM" }).click();
  await page.getByRole("button", { name: "Ranked" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Rank & role" })).toHaveCount(0);
  await next.click();

  await expect(page.getByRole("heading", { name: "Link your Riot account" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Exit" })).toHaveAttribute("href", "/dashboard");
  await expect(next).toBeDisabled();
  await page.getByRole("button", { name: "Skip for now" }).click();

  await expect(page.getByRole("heading", { name: "Current rank" })).toHaveCount(0);
  await page.getByRole("button", { name: "Weekends" }).click();
  await page.getByRole("button", { name: "Casual play" }).click();
  await page.getByRole("button", { name: "Chill" }).click();
  await next.click();

  await expect(page.getByRole("heading", { name: "How do you use voice chat?" })).toBeVisible();
  await page.getByRole("button", { name: "Skip for now" }).click();

  const review = page.getByRole("heading", { name: "Review your details" }).locator("..");
  await expect(review).toContainText("ARAM");
  await expect(review.getByText("Rank", { exact: true })).toHaveCount(0);
  await expect(review.getByText("Role", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Create profile" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const me = await apiCall<{ profile: { rankTier: string; role: string; playModes: string[] } }>(`/profiles/me?game=${LOL}`, {
    token: user.token,
  });
  expect(me.profile).toMatchObject({ rankTier: "Unranked", role: "Fill", playModes: ["aram"] });
});

test("ARAM team created without rank range shows under the ARAM filter only", async ({ page }) => {
  test.slow();
  const captain = await createAramPlayer("W9 Cap");
  const teamName = `W9 ARAM ${uniqueTag()}`;
  await signIn(page, captain, LOL);

  await page.goto("/teams/new");
  await page.getByLabel("Team name").fill(teamName);
  await page.getByRole("radio", { name: "ARAM" }).click();
  await expect(page.getByRole("combobox", { name: "Minimum rank" })).toHaveCount(0);
  await expect(page.getByText("Needed roles")).toHaveCount(0);
  await page.getByRole("button", { name: "Weekends" }).click();
  await page.getByRole("button", { name: "Casual play" }).click();
  await page.getByRole("combobox", { name: "Comm style" }).click();
  await page.getByRole("option", { name: "Chill" }).click();
  await page.getByRole("button", { name: "Create team" }).click();

  await expect(toast(page, "Team created")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: teamName })).toBeVisible();
  await expect(page.getByRole("main").getByText("ARAM", { exact: true }).first()).toBeVisible();

  await page.goto("/teams");
  const browse = page.locator("section", { has: page.getByRole("heading", { name: "Recruiting teams" }) });
  await browse.getByRole("button", { name: "Filters" }).click();
  const filters = page.getByRole("dialog");
  await filters.getByRole("combobox", { name: "Mode" }).click();
  await page.getByRole("option", { name: "ARAM" }).click();
  const card = browse.locator('[data-slot="card"]').filter({ has: page.getByRole("link", { name: teamName, exact: true }) });
  await expect(card).toBeVisible();
  await expect(card.getByText("ARAM", { exact: true })).toBeVisible();

  const rankedTeams = page.waitForResponse((response) => response.url().includes("/teams?") && response.url().includes("mode=ranked"));
  await filters.getByRole("combobox", { name: "Mode" }).click();
  await page.getByRole("option", { name: "Ranked" }).click();
  await rankedTeams;
  await expect(browse.getByRole("link", { name: teamName, exact: true })).toHaveCount(0);
});
