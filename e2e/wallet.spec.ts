import { expect, test } from "@playwright/test";
import { createPlayer, loginUser, SEEDED_ADMIN, setEnglish, signIn, toast } from "./helpers";

// Needs the API running with PAYMENT_PROVIDER=mock (or no payOS keys).
const LOL = "league_of_legends";

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("a player tops up through checkout and spends credits on a boost", async ({ page, browser }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const player = await createPlayer("E2E Wallet", [LOL]);
  await signIn(page, player, LOL);
  await page.goto("/dashboard");
  await expect(page.getByTestId("boost-card").getByRole("link", { name: "Top up" })).toBeVisible();
  await page.locator("header").getByRole("button", { name: "Inbox" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Open inbox" }).click();
  await expect(page).toHaveURL(/\/inbox$/);
  await page.getByTestId("topbar-balance").click();
  await expect(page).toHaveURL(/\/wallet$/);

  await expect(page.getByTestId("credit-balance")).toContainText("0");
  await expect(page.getByTestId("topbar-balance")).toHaveText("0");
  await page.getByRole("radio", { name: "20 credits" }).check();
  await page.getByRole("button", { name: /^Pay 20\.000/ }).click();
  await expect(page).toHaveURL(/\/wallet\/checkout\?order=\d+$/);
  await page.getByRole("button", { name: "Pay", exact: true }).click();

  await expect(page).toHaveURL(/\/wallet$/);
  await expect(toast(page, "Added 20 credits")).toBeVisible();
  await expect(page.getByTestId("credit-balance")).toContainText("20");
  await expect(page.getByTestId("topbar-balance")).toHaveText("20");
  await expect(page.getByRole("cell", { name: "Top-up" })).toBeVisible();

  await page.goto("/dashboard");
  await page.getByTestId("boost-card").getByRole("button", { name: /Boost profile/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Pay 20 credits" }).click();
  await expect(toast(page, "Profile boosted")).toBeVisible();
  await expect(page.getByText(/Boosted until/)).toBeVisible();
  await expect(page.getByTestId("topbar-balance")).toHaveText("0");
  await page.goto("/wallet");
  await expect(page.getByTestId("credit-balance")).toContainText("0");
  await expect(page.getByRole("cell", { name: "Profile boost" })).toBeVisible();

  // The admin finance dashboard shows the paid top-up.
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await setEnglish(adminContext);
  const adminPage = await adminContext.newPage();
  await signIn(adminPage, await loginUser(SEEDED_ADMIN.email, SEEDED_ADMIN.password));
  await adminPage.goto("/admin");
  const topUp = adminPage.getByRole("row").filter({ hasText: player.displayName });
  await expect(topUp).toContainText(/20[.,]000/);
  await expect(topUp).toContainText("Paid");
  await adminContext.close();
});

test("an admin grants credits from the credit ledger", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const [player, admin] = await Promise.all([createPlayer("E2E Grant", [LOL]), loginUser(SEEDED_ADMIN.email, SEEDED_ADMIN.password)]);
  await signIn(page, admin);
  await page.goto("/admin");

  await page.getByRole("navigation", { name: "Admin console" }).getByRole("link", { name: "Credits" }).click();
  await page.getByRole("combobox", { name: "User" }).click();
  await page.getByPlaceholder("Search name or email").fill(player.email);
  await page.getByRole("option", { name: new RegExp(player.displayName) }).click();
  await expect(page.getByRole("combobox", { name: "User" })).toHaveText(player.displayName);
  await page.getByRole("spinbutton", { name: "Credits" }).fill("15");
  await page.getByLabel("Reason").fill("e2e grant");
  await page.getByRole("button", { name: "Apply" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText(`Add 15 credits to ${player.displayName}?`);
  await confirm.getByRole("button", { name: "Apply" }).click();
  await expect(toast(page, "Balance adjusted")).toBeVisible();

  // The ledger follows the picked user.
  await expect(page.getByRole("button", { name: "Clear filter" })).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: player.displayName });
  await expect(row).toContainText("Adjustment");
  await expect(row).toContainText("+15");
});
