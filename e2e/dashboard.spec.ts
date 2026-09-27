import { expect, test } from "@playwright/test";
import { createPlayer, setEnglish, signIn } from "./helpers";

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("switching the global game changes the dashboard to that game's profile", async ({ page }) => {
  const player = await createPlayer("E2E Duo", ["valorant", "league_of_legends"]);
  await signIn(page, player, "valorant");
  await page.goto("/dashboard");

  const identity = page.locator('[data-slot="card"]').filter({ has: page.getByRole("heading", { level: 1, name: player.displayName }) });
  const switcher = page.getByRole("banner").getByRole("button", { name: /Valorant|League of Legends/ });

  await expect(switcher).toHaveText(/Valorant/);
  await expect(identity).toContainText("Duelist");

  await switcher.click();
  await page.getByRole("menuitemradio", { name: "League of Legends" }).click();

  await expect(switcher).toHaveText(/League of Legends/);
  await expect(identity).toContainText("Mid");
  await expect(identity).not.toContainText("Duelist");

  await page.reload();
  await expect(switcher).toHaveText(/League of Legends/);
});
