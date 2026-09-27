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

  await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
  await page.getByRole("tab", { name: "Reports" }).click();
  await expect(page.getByRole("row").filter({ hasText: target.displayName }).first()).toBeVisible();
});
