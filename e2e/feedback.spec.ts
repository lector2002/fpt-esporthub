import { expect, test } from "@playwright/test";
import { createPlayer, loginUser, SEEDED_ADMIN, setEnglish, signIn } from "./helpers";

const LOL = "league_of_legends";

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("a player sends a bug report from the side tab and an admin resolves it in the Feedback tab", async ({ page, browser }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const player = await createPlayer("E2E Feedback", [LOL]);
  const message = `Chat scroll jumps ${Date.now()}`;
  await signIn(page, player, LOL);
  await page.goto("/dashboard");

  await page.getByTestId("feedback-drawer-tab").click();
  const drawer = page.getByTestId("feedback-drawer");
  await drawer.getByRole("button", { name: "Send" }).click();
  await expect(drawer).toContainText("Write a message.");
  await drawer.getByLabel("Message").fill(message);
  await drawer.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Thanks! An admin will read it.")).toBeVisible();
  await expect(drawer).toBeHidden();

  const admin = await loginUser(SEEDED_ADMIN.email, SEEDED_ADMIN.password);
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await setEnglish(adminContext);
  const adminPage = await adminContext.newPage();
  await signIn(adminPage, admin);
  await adminPage.goto("/admin/feedback");
  await adminPage.getByRole("radio", { name: /^Bug/ }).click();
  await adminPage.getByLabel("Search message, page or sender").fill(message);
  await adminPage.keyboard.press("Enter");
  await expect(adminPage.getByRole("row")).toHaveCount(2);
  const row = adminPage.getByRole("row").filter({ hasText: message });
  await expect(row).toContainText(player.displayName);
  await row.getByRole("button", { name: "Bug" }).click();
  const dialog = adminPage.getByRole("dialog");
  await expect(dialog).toContainText("/dashboard");
  await dialog.getByLabel("Internal note").fill("Repro on Android Chrome");
  await dialog.getByRole("button", { name: "Save note" }).click();
  await expect(adminPage.getByText("Note saved")).toBeVisible();
  // Disabled again only once the refetched item carries the saved note.
  await expect(dialog.getByRole("button", { name: "Save note" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Resolve" }).click();
  await expect(row).toBeHidden();
  await adminContext.close();
});
