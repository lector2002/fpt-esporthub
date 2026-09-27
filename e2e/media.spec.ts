import { expect, test } from "@playwright/test";
import { apiCall, createPlayer, setEnglish, signIn, toast, uniqueTag } from "./helpers";

const LOL = "league_of_legends";
// 8x8 orange PNG.
const PNG = {
  name: "trophy.png",
  mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVR4nGP4UG+DFTEMLQkA4y9qwfgMuecAAAAASUVORK5CYII=", "base64"),
};

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("the account menu sits in the top bar and the old offline page opens the tournament hub", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const player = await createPlayer("E2E Shell", [LOL]);
  await signIn(page, player, LOL);
  await page.goto("/tournaments");

  await expect(page).toHaveURL(/\/events\?type=offline$/);
  await expect(page.getByRole("tab", { name: "At internet cafes" })).toHaveAttribute("aria-selected", "true");
  await page.locator("header").getByRole("button", { name: "Account" }).click();
  await expect(page.getByRole("menuitem", { name: "Log out" })).toBeVisible();

  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Online" }).click();
  await expect(page).toHaveURL(/\/events$/);
});

test("a player uploads an avatar and an achievement that others can see", async ({ page, browser }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const [player, viewer] = await Promise.all([createPlayer("E2E Pics", [LOL]), createPlayer("E2E Viewer", [LOL])]);
  await signIn(page, player, LOL);
  await page.goto("/profile/me");

  await page.locator("#overview").getByTestId("picture-input").setInputFiles(PNG);
  await expect(toast(page, "Picture updated")).toBeVisible();
  await expect(page.locator("header").getByRole("button", { name: "Account" }).locator("img")).toHaveAttribute("src", /\/api\/v1\/media\/files\/[0-9a-f-]+\.webp$/);

  const gallery = page.locator("#achievements");
  await gallery.getByRole("button", { name: "Add achievement" }).click();
  const dialog = page.getByRole("dialog", { name: "Add achievement" });
  await dialog.getByLabel("Title").fill("Campus Cup MVP");
  await dialog.getByLabel("Picture").setInputFiles(PNG);
  await dialog.getByRole("button", { name: "Add" }).click();
  await expect(toast(page, "Achievement added")).toBeVisible();
  await expect(gallery.locator("[data-achievement]")).toHaveCount(1);

  const other = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await setEnglish(other);
  const viewerPage = await other.newPage();
  await signIn(viewerPage, viewer, LOL);
  await viewerPage.goto(`/players/${player.id}`);
  await expect(viewerPage.getByRole("heading", { level: 1, name: player.displayName })).toBeVisible();
  await expect(viewerPage.getByRole("button", { name: "View Campus Cup MVP" })).toBeVisible();
  // Viewers see the gallery but can't change it.
  await expect(viewerPage.getByRole("button", { name: "Add achievement" })).toHaveCount(0);
  await expect(viewerPage.getByRole("button", { name: "Remove achievement" })).toHaveCount(0);
  await other.close();

  await gallery.getByRole("button", { name: "Remove achievement" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove achievement" }).click();
  await expect(toast(page, "Achievement removed")).toBeVisible();
  await expect(gallery.locator("[data-achievement]")).toHaveCount(0);
});

test("a player and a captain upload card covers that show on the profile and the team page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const player = await createPlayer("E2E Cover", [LOL]);
  await signIn(page, player, LOL);
  await page.goto("/profile/me");

  const overview = page.locator("#overview");
  await overview.getByTestId("cover-input").setInputFiles(PNG);
  await expect(toast(page, "Picture updated")).toBeVisible();
  await expect(overview.getByRole("button", { name: "Change cover" })).toBeVisible();
  await page.goto(`/players/${player.id}`);
  await expect(page.locator('img[src*="/api/v1/media/files/"]').first()).toBeVisible();

  const created = await apiCall<{ team?: { id: string } }>("/teams", {
    method: "POST",
    token: player.token,
    body: { name: `Cover ${uniqueTag()}`.slice(0, 32), game: LOL, rankMin: "Silver", rankMax: "Platinum", neededRoles: ["mid"], schedule: ["weekend"], goals: ["rank_climb"], communicationStyle: "chill" },
  });
  await page.goto(`/teams/${created.team!.id}`);
  await page.getByTestId("cover-input").setInputFiles(PNG);
  await expect(toast(page, "Picture updated")).toBeVisible();
  await page.getByRole("button", { name: "Change cover" }).click();
  await page.getByRole("menuitem", { name: "Remove cover" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove cover" }).click();
  await expect(toast(page, "Picture removed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload cover" })).toBeVisible();
});
