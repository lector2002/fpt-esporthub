import { expect, test } from "@playwright/test";
import { apiCall, createPlayer, loginUser, SEEDED_ADMIN, setEnglish, signIn, toast } from "./helpers";

const LOL = "league_of_legends";

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("a player opens build guides from the sidebar and buys the premium pass", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const [player, admin] = await Promise.all([createPlayer("E2E Guides", [LOL]), loginUser(SEEDED_ADMIN.email, SEEDED_ADMIN.password)]);
  await apiCall("/admin/credits/adjust", { method: "POST", token: admin.token, body: { userId: player.id, amount: 50, note: "e2e guides" } });
  await signIn(page, player, LOL);
  await page.goto("/dashboard");

  await page.getByRole("link", { name: "Build guides" }).click();
  await expect(page).toHaveURL(/\/guides$/);
  await expect(page.getByRole("heading", { level: 1, name: "Build guides" })).toBeVisible();

  const premium = page.getByTestId("premium-card");
  await premium.getByRole("button", { name: "Unlock premium · 49 credits" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Pay 49 credits" }).click();
  await expect(toast(page, "Guides premium unlocked")).toBeVisible();
  await expect(premium).toContainText("Premium until");
  await expect(premium.getByRole("link", { name: "Top up · need 49" })).toBeVisible();
});
