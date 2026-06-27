import { expect, test } from "@playwright/test";

test("Phase 1 seeded user can navigate core live flow", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Welcome back, MinhNguyen.")).toBeVisible();

  await page.getByRole("link", { name: "Find Match" }).click();
  await expect(page.getByRole("heading", { name: "Find Match" })).toBeVisible();
  await expect(page.getByText("KhoaSentinel")).toBeVisible();

  await page.getByRole("button", { name: "Find Teams" }).click();
  await expect(page.getByText("Phoenix Rising")).toBeVisible();

  await page.getByRole("link", { name: "Teams" }).click();
  await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();
  await expect(page.getByText("Phoenix Rising")).toBeVisible();

  await page.getByRole("link", { name: "Events" }).click();
  await expect(page.getByRole("heading", { name: "Tournament Events" })).toBeVisible();
  await expect(page.getByText("FPT Valorant Beta Cup")).toBeVisible();

  await page.getByRole("button", { name: "Open squad comms" }).click();
  await page.getByRole("link", { name: "View all" }).click();
  await expect(page.getByRole("heading", { name: "Requests" })).toBeVisible();
  await expect(page.getByText("KhoaSentinel")).toBeVisible();

  await page.getByRole("link", { name: "Profile" }).click();
  await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "MinhNguyen" })).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("new user can register and complete onboarding", async ({ page }) => {
  const suffix = Date.now();
  await page.goto("/register");
  await page.getByPlaceholder("you@fpt.edu.vn").fill(`beta-${suffix}@fpt.edu.vn`);
  await page.getByPlaceholder("Your in-game name").fill(`Beta${suffix}`);
  await page.getByPlaceholder("At least 8 characters").fill("Password123!");
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole("button", { name: "Valorant" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByRole("combobox").selectOption("Gold 2");
  await page.getByRole("button", { name: "Duelist" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByPlaceholder("e.g. Tối T2-T6, cuối tuần").fill("weekday_evening, weekend");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByRole("button", { name: "Rank climb" }).click();
  await page.getByRole("button", { name: "Find team" }).click();
  await page.getByRole("button", { name: "Try-hard" }).click();
  await page.getByRole("button", { name: "Shotcaller" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByPlaceholder("YourName#Tag").fill(`Beta${suffix}#VN1`);
  await page.getByRole("button", { name: "Complete Setup" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(`Welcome back, Beta${suffix}.`)).toBeVisible();
});
