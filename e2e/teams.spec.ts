import { expect, test } from "@playwright/test";
import { createPlayer, setEnglish, signIn, toast, uniqueTag } from "./helpers";

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("created team shows in My teams and its detail page renders", async ({ page }) => {
  test.slow();
  const captain = await createPlayer("E2E Cap");
  const teamName = `E2E Team ${uniqueTag()}`;
  await signIn(page, captain);

  await page.goto("/teams");
  await page.getByRole("link", { name: "Create team" }).click();
  await expect(page).toHaveURL(/\/teams\/new$/);

  await page.getByLabel("Team name").fill(teamName);
  await page.getByRole("combobox", { name: "Minimum rank" }).click();
  await page.getByRole("option", { name: "Gold" }).click();
  await page.getByRole("combobox", { name: "Maximum rank" }).click();
  await page.getByRole("option", { name: "Diamond" }).click();
  await page.getByRole("button", { name: "Weekday evenings" }).click();
  await page.getByRole("button", { name: "Rank climb" }).click();
  await page.getByRole("combobox", { name: "Comm style" }).click();
  await page.getByRole("option", { name: "Chill" }).click();
  await page.getByRole("button", { name: "Create team" }).click();

  await expect(toast(page, "Team created")).toBeVisible();
  await expect(page).toHaveURL(/\/teams\/(?!new)[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: teamName })).toBeVisible();
  await expect(page.getByText("Roster")).toBeVisible();

  await page.goto("/teams");
  const myTeams = page.locator("section", { has: page.getByRole("heading", { name: "My teams" }) });
  await expect(myTeams.getByRole("link", { name: teamName, exact: true })).toBeVisible();
});

test("the team card preview follows the create form", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const captain = await createPlayer("E2E Preview");
  await signIn(page, captain);
  await page.goto("/teams/new");

  const preview = page.getByTestId("team-preview");
  await expect(preview.getByText("Team name")).toBeVisible();
  const name = `Preview ${uniqueTag()}`.slice(0, 24);
  await page.getByLabel("Team name").fill(name);
  await expect(preview.getByText(name)).toBeVisible();
  await expect(preview.getByText(captain.displayName)).toBeVisible();
});
