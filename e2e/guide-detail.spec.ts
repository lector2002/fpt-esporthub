import { expect, test } from "@playwright/test";
import { PrismaClient } from "@fpt-esporthub/database";
import { apiCall, createPlayer, loginUser, SEEDED_ADMIN, setEnglish, signIn, toast } from "./helpers";
import { SAMPLE_ROWS, SAMPLE_SOURCE } from "./sample-guide";

// Writes a sample guide straight into the database, so it needs DATABASE_URL (not available against E2E_BASE_URL stacks).
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL to insert the sample guide");

const LOL = "league_of_legends";
const SHOTS = "output/guides-shots";
const prisma = new PrismaClient();

test.beforeAll(async () => {
  await prisma.buildGuide.deleteMany({ where: { source: SAMPLE_SOURCE } });
  await prisma.buildGuide.createMany({
    data: SAMPLE_ROWS.map((row) => ({ ...row, patch: "16.19", source: SAMPLE_SOURCE, sourceUrl: "https://example.com/ahri", fetchedAt: new Date() })),
  });
});

test.afterAll(async () => {
  await prisma.buildGuide.deleteMany({ where: { source: SAMPLE_SOURCE } });
  await prisma.$disconnect();
});

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("a free player sees the most picked build and unlocks the rest with premium", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const [player, admin] = await Promise.all([createPlayer("E2E Guide", [LOL]), loginUser(SEEDED_ADMIN.email, SEEDED_ADMIN.password)]);
  await apiCall("/admin/credits/adjust", { method: "POST", token: admin.token, body: { userId: player.id, amount: 50, note: "e2e guide detail" } });
  await signIn(page, player, LOL);
  await page.goto("/guides");
  await page.getByRole("link", { name: /Ahri/ }).first().click();
  await expect(page).toHaveURL(/\/guides\/Ahri\/mid$/);

  await expect(page.getByRole("heading", { level: 1, name: "Ahri" })).toBeVisible();
  await expect(page.getByText("Tier 1")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Positions" }).getByRole("link", { name: "Mid" })).toHaveAttribute("aria-current", "page");

  const overview = page.locator('[data-section="overview"]');
  await expect(overview.getByRole("img", { name: "Electrocute" })).toBeVisible();
  await expect(overview.getByText("Luden's Echo")).toBeVisible();
  await expect(overview.getByText("Q > W > E")).toBeVisible();
  await expect(overview.getByText("×2")).toBeVisible();

  const runes = page.locator('[data-section="runes"]');
  await expect(runes.locator("[data-rune-page]")).toBeVisible();
  await expect(runes.locator("[data-locked]")).toHaveAttribute("data-locked", "2");
  await expect(page.locator('[data-section="skills"] table').first()).toContainText("R");
  await expect(page.locator('[data-section="matchups"] [data-option]')).toHaveCount(6);
  await expect(page.getByTestId("premium-card")).toContainText("4th to 6th items");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SHOTS}/free-desktop.png`, fullPage: true });

  await runes.getByRole("link", { name: "2 more with Premium" }).click();
  const premium = page.getByTestId("premium-card");
  await premium.getByRole("button", { name: "Unlock premium · 49 credits" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Pay 49 credits" }).click();
  await expect(toast(page, "Guides premium unlocked")).toBeVisible();

  await expect(page.locator("[data-locked]")).toHaveCount(0);
  await expect(page.getByTestId("premium-card")).toHaveCount(0);
  await expect(runes.locator("[data-option]")).toHaveCount(2);
  await expect(page.locator('[data-section="matchups"] [data-option]')).toHaveCount(10);
  await expect(page.locator('[data-section="late-items"] [data-option]')).toHaveCount(7);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SHOTS}/premium-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Ahri" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `${SHOTS}/premium-mobile.png`, fullPage: true });
});
