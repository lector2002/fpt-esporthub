import { expect, test } from "@playwright/test";
import { apiCall, createPlayer, loginUser, SEEDED_ADMIN, setEnglish, signIn, toast } from "./helpers";

const LOL = "league_of_legends";

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("a player buys a frame and a banner that others see on the profile", async ({ page, browser }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const [player, viewer, admin] = await Promise.all([
    createPlayer("E2E Style", [LOL]),
    createPlayer("E2E Looker", [LOL]),
    loginUser(SEEDED_ADMIN.email, SEEDED_ADMIN.password),
  ]);
  await apiCall("/admin/credits/adjust", { method: "POST", token: admin.token, body: { userId: player.id, amount: 60, note: "e2e cosmetics" } });
  await signIn(page, player, LOL);
  await page.goto("/profile/me#cosmetics");

  const shop = page.locator("#cosmetics");
  await shop.locator('[data-cosmetic="frame_gold"]').getByRole("button", { name: "Buy · 30 credits" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Pay 30 credits" }).click();
  await expect(toast(page, "Bought and in use")).toBeVisible();
  await expect(shop.locator('[data-cosmetic="frame_gold"]')).toContainText("In use");
  await shop.getByRole("tab", { name: "Banners" }).click();
  await shop.locator('[data-cosmetic="banner_aurora"]').getByRole("button", { name: "Buy · 25 credits" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Pay 25 credits" }).click();
  await expect(shop.locator('[data-cosmetic="banner_aurora"]')).toContainText("In use");
  await expect(shop.getByRole("link", { name: "5 credits" })).toBeVisible();
  await expect(page.locator("#overview [data-frame='frame_gold']")).toBeVisible();

  const other = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await setEnglish(other);
  const viewerPage = await other.newPage();
  await signIn(viewerPage, viewer, LOL);
  await viewerPage.goto(`/players/${player.id}`);
  await expect(viewerPage.getByRole("heading", { level: 1, name: player.displayName })).toBeVisible();
  await expect(viewerPage.locator("[data-frame='frame_gold']")).toBeVisible();
  await expect(viewerPage.locator("[data-banner='banner_aurora']")).toBeVisible();
  await viewerPage.screenshot({ path: "output/cosmetics-shots/public-profile.png" });
  await page.screenshot({ path: "output/cosmetics-shots/shop.png" });
  await other.close();
});
