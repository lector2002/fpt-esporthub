import { expect, test } from "@playwright/test";
import { apiCall, createPlayer, loginUser, SEEDED_ADMIN, setEnglish, signIn } from "./helpers";

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("admin finds a new user report in the reports tab", async ({ page }) => {
  // Own fixture report so this test does not depend on safety.spec.ts running first.
  const [reporter, target] = await Promise.all([createPlayer("E2E Rep"), createPlayer("E2E Tgt")]);
  await apiCall("/reports", {
    method: "POST",
    token: reporter.token,
    body: { targetType: "user", targetId: target.id, reason: "harassment", details: "e2e admin check" },
  });

  const admin = await loginUser(SEEDED_ADMIN.email, SEEDED_ADMIN.password);
  await signIn(page, admin);
  await page.goto("/admin");

  // The console home is the finance dashboard, and an admin without a game profile sees no player features.
  const consoleNav = page.getByRole("navigation", { name: "Admin console" });
  await expect(page.getByRole("heading", { level: 1, name: "Revenue" })).toBeVisible();
  await expect(consoleNav.getByRole("link", { name: "Revenue" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Find Match" })).toHaveCount(0);
  await expect(page.locator("header").getByRole("button", { name: "Inbox" })).toHaveCount(0);
  await page.locator("header").getByRole("button", { name: "Account" }).click();
  await expect(page.getByRole("menuitem", { name: "Profile" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await consoleNav.getByRole("link", { name: "Reports" }).click();
  await expect(page).toHaveURL(/\/admin\/reports$/);
  await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: target.displayName }).first()).toBeVisible();
});
