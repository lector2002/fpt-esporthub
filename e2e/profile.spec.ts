import { expect, test } from "@playwright/test";
import { createPlayer, setEnglish, signIn, toast } from "./helpers";

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("edits in two sections are saved together from one bar and survive a reload", async ({ page }) => {
  const player = await createPlayer("E2E Bio");
  const bio = `Entry fragger, evenings only ${Date.now()}`;
  await signIn(page, player);
  await page.goto("/profile/me");

  const saveBar = page.getByRole("region", { name: "Unsaved changes" });
  await expect(saveBar).toHaveCount(0);
  await page.locator("#overview").getByLabel("Bio").fill(bio);
  const lateNight = page.locator("#game").getByRole("button", { name: "Late night" });
  const wasOn = (await lateNight.getAttribute("aria-pressed")) === "true";
  await lateNight.click();
  await saveBar.getByRole("button", { name: "Save changes" }).click();
  await expect(toast(page, "Profile saved")).toBeVisible();
  await expect(saveBar).toHaveCount(0);

  await page.reload();
  await expect(page.locator("#overview").getByLabel("Bio")).toHaveValue(bio);
  await expect(page.locator("#game").getByRole("button", { name: "Late night" })).toHaveAttribute("aria-pressed", String(!wasOn));
});

test("discard puts unsaved edits back", async ({ page }) => {
  const player = await createPlayer("E2E Discard");
  await signIn(page, player);
  await page.goto("/profile/me");

  const name = page.locator("#overview").getByLabel("Display name");
  const original = await name.inputValue();
  await name.fill("Someone Else");
  const saveBar = page.getByRole("region", { name: "Unsaved changes" });
  await saveBar.getByRole("button", { name: "Discard" }).click();
  await expect(saveBar).toHaveCount(0);
  await expect(page.locator("#overview").getByLabel("Display name")).toHaveValue(original);
});
