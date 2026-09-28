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
  await page.goto("/shop");

  await page.locator('[data-cosmetic="frame_frost"]').getByRole("button", { name: "Buy · 30 credits" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Pay 30 credits" }).click();
  await expect(toast(page, "Bought and in use")).toBeVisible();
  await expect(page.locator('[data-cosmetic="frame_frost"]')).toContainText("In use");
  await page.getByRole("tab", { name: "Banners" }).click();
  await page.locator('[data-cosmetic="banner_sunset"]').getByRole("button", { name: "Buy · 25 credits" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Pay 25 credits" }).click();
  await expect(page.locator('[data-cosmetic="banner_sunset"]')).toContainText("In use");
  await expect(page.getByRole("main").getByRole("link", { name: "5 credits", exact: true })).toBeVisible();
  await page.screenshot({ path: "output/cosmetics-shots/shop.png" });

  await page.goto("/profile/me?tab=decor");
  await expect(page.locator("[data-frame='frame_frost']").first()).toBeVisible();
  await expect(page.locator('#cosmetics [data-cosmetic="banner_sunset"]')).toContainText("In use");

  const other = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await setEnglish(other);
  const viewerPage = await other.newPage();
  await signIn(viewerPage, viewer, LOL);
  await viewerPage.goto(`/players/${player.id}`);
  await expect(viewerPage.getByRole("heading", { level: 1, name: player.displayName })).toBeVisible();
  await expect(viewerPage.locator("[data-frame='frame_frost']")).toBeVisible();
  await expect(viewerPage.locator("[data-banner='banner_sunset']")).toBeVisible();
  await viewerPage.screenshot({ path: "output/cosmetics-shots/public-profile.png" });
  await other.close();
});

test("the mystery box gives a new item each time and it can be used right away", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const [player, admin] = await Promise.all([createPlayer("E2E Gacha", [LOL]), loginUser(SEEDED_ADMIN.email, SEEDED_ADMIN.password)]);
  await apiCall("/admin/credits/adjust", { method: "POST", token: admin.token, body: { userId: player.id, amount: 20, note: "e2e gacha" } });
  await signIn(page, player, LOL);
  await page.goto("/shop");

  const box = page.getByTestId("gacha");
  const dialog = page.getByRole("dialog");
  const won = dialog.getByTestId("gacha-won");

  await box.getByRole("button", { name: "Open box · 10 credits" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Pay 10 credits" }).click();
  await expect(won).toBeVisible();
  const first = await won.textContent();
  await page.screenshot({ path: "output/cosmetics-shots/gacha-reveal.png" });

  await dialog.getByRole("button", { name: "Open box · 10 credits" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Pay 10 credits" }).click();
  await expect(won).toBeVisible();
  await expect(won).not.toHaveText(first ?? "");

  await dialog.getByRole("button", { name: "Use now" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("main").getByRole("link", { name: "0 credits", exact: true })).toBeVisible();
  await expect(box.getByRole("link", { name: /Top up/ })).toBeVisible();
  await expect(page.locator("[data-cosmetic]").filter({ hasText: "In use" })).toHaveCount(1);
});
