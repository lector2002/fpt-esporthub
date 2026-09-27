import { expect, test } from "@playwright/test";
import { PASSWORD, SEEDED_USER, setEnglish, uniqueEmail, uniqueTag } from "./helpers";

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("new user registers, completes Valorant onboarding and lands on the dashboard", async ({ page }) => {
  test.slow();
  const displayName = `E2E Reg ${uniqueTag()}`;

  await page.goto("/register");
  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  const next = page.getByRole("button", { name: "Continue" });

  await page.getByRole("radio", { name: "Valorant" }).click();
  await next.click();

  await page.getByRole("radio", { name: "Gold", exact: true }).click();
  await page.getByRole("radio", { name: "2", exact: true }).click();
  await page.getByRole("radio", { name: "Duelist" }).click();
  await next.click();

  await page.getByRole("button", { name: "Weekday evenings" }).click();
  await page.getByRole("button", { name: "Rank climb" }).click();
  await page.getByRole("button", { name: "Chill" }).click();
  await next.click();

  await expect(page.getByLabel("Riot ID")).toBeVisible();
  await next.click();

  await page.getByRole("button", { name: "Skip for now" }).click();

  await expect(page.getByRole("heading", { name: "Review your details" })).toBeVisible();
  await page.getByRole("button", { name: "Create profile" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1, name: displayName })).toBeVisible();
});

test("login with a wrong password shows an error and stays on the login page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SEEDED_USER.email);
  await page.getByLabel("Password", { exact: true }).fill("WrongPassword1!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "Incorrect email or password." })).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("seeded user is sent back to the requested page after login and can log out", async ({ page }) => {
  await page.goto("/profile/me");
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile%2Fme/);

  await page.getByLabel("Email").fill(SEEDED_USER.email);
  await page.getByLabel("Password", { exact: true }).fill(SEEDED_USER.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/profile\/me$/);
  await expect(page.getByRole("heading", { name: "My profile" })).toBeVisible();

  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});
