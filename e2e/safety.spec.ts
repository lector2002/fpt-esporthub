import { expect, test } from "@playwright/test";
import { createPlayer, matchCardFor, setEnglish, signIn, toast } from "./helpers";

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("reported and blocked player disappears from matches and their profile becomes not found", async ({ page }) => {
  test.slow();
  const [reporter, target] = await Promise.all([createPlayer("E2E Rep"), createPlayer("E2E Tgt")]);
  await signIn(page, reporter, "valorant");

  await page.goto("/find-match");
  await expect(await matchCardFor(page, target.displayName)).toBeVisible();

  await page.goto(`/players/${target.id}`);
  await expect(page.getByRole("heading", { level: 1, name: target.displayName })).toBeVisible();

  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Report" }).click();
  const reportDialog = page.getByRole("dialog", { name: `Report ${target.displayName}` });
  await reportDialog.getByLabel("Spam").check();
  await reportDialog.getByLabel("Details (optional)").fill("Spams invites in chat.");
  await reportDialog.getByRole("button", { name: "Send report" }).click();
  await expect(toast(page, "Report sent")).toBeVisible();
  await expect(reportDialog).toBeHidden();

  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Block" }).click();
  const blockDialog = page.getByRole("alertdialog", { name: `Block ${target.displayName}?` });
  await blockDialog.getByRole("button", { name: "Block" }).click();
  await expect(toast(page, `Blocked ${target.displayName}`)).toBeVisible();

  await page.goto("/find-match");
  await expect(await matchCardFor(page, target.displayName)).toHaveCount(0);

  await page.goto(`/players/${target.id}`);
  await expect(page.getByText("Player not found")).toBeVisible();
});
