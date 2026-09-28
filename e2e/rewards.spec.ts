import { expect, test } from "@playwright/test";
import { apiCall, createPlayer, loginUser, SEEDED_ADMIN, setEnglish, signIn } from "./helpers";

// Needs the API running with PAYMENT_PROVIDER=mock (or no payOS keys).
const LOL = "league_of_legends";

type Wallet = { balance: number; locked: number };
type CheckIn = { claimed: boolean; streak: number; reward: number; rules: { daily: number } };

// Opt back in to the check-in the config turns off for every other spec.
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("the first visit of the day shows the login rewards popup once and adds locked credits", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const player = await createPlayer("E2E Rewards", [LOL]);
  await signIn(page, player, LOL);
  await page.goto("/dashboard");

  const popup = page.getByTestId("daily-reward");
  await expect(popup).toBeVisible();
  await expect(popup.getByTestId("daily-reward-amount")).toHaveText("+3");
  await expect(popup).toContainText("1-day streak");
  await expect(popup).toContainText("Get the Solara pet");
  await expect(popup.getByRole("link", { name: "Top up" })).toHaveAttribute("href", "/wallet");
  await popup.getByRole("button", { name: "Nice" }).click();
  await expect(popup).toBeHidden();
  await expect(page.getByTestId("topbar-balance")).toHaveText("3");

  await page.goto("/wallet");
  await expect(page.getByTestId("locked-balance")).toContainText("Includes 3 reward credits");
  await expect(page.getByRole("cell", { name: "Login reward" })).toBeVisible();
  // Closed popup: the same rewards stay on the wallet.
  const card = page.getByTestId("rewards-card");
  await expect(card).toContainText("1-day streak");
  await expect(card).toContainText("Get the Solara pet");
  await page.reload();
  await expect(page.getByTestId("credit-balance")).toContainText("3");
  await expect(page.getByTestId("daily-reward")).toBeHidden();
});

test("spends use reward credits first and the first top-up gives Solara", async () => {
  const player = await createPlayer("E2E Rewards Spend", [LOL]);
  const checkIn = await apiCall<CheckIn>("/credits/check-in", { method: "POST", token: player.token });
  expect(checkIn.claimed).toBe(true);
  const admin = await loginUser(SEEDED_ADMIN.email, SEEDED_ADMIN.password);
  await apiCall("/admin/credits/adjust", { method: "POST", token: admin.token, body: { userId: player.id, amount: 20, note: "e2e rewards" } });

  await apiCall("/credits/promotions/boost", { method: "POST", token: player.token, body: { game: LOL } });
  const afterBoost = await apiCall<Wallet>("/credits/me", { token: player.token });
  expect([afterBoost.balance, afterBoost.locked]).toEqual([checkIn.rules.daily, 0]);

  const { topUp } = await apiCall<{ topUp: { orderCode: number } }>("/credits/topups", { method: "POST", token: player.token, body: { credits: 20 } });
  await apiCall(`/credits/topups/${topUp.orderCode}/mock-pay`, { method: "POST", token: player.token });
  const shop = await apiCall<{ owned: string[]; equipped: { pet: string | null } }>("/cosmetics/me", { token: player.token });
  expect(shop.owned).toContain("pet_solara");
  expect(shop.equipped.pet).toBe("pet_solara");
});

test("the gold tab on the right edge opens rewards and what's on now, and closing the popup keeps it there", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const player = await createPlayer("E2E Rewards Drawer", [LOL]);
  await signIn(page, player, LOL);
  await page.goto("/dashboard");
  await page.getByTestId("daily-reward").getByRole("button", { name: "Nice" }).click();

  await page.getByTestId("rewards-drawer-tab").click();
  const drawer = page.getByTestId("rewards-drawer");
  await expect(drawer).toContainText("1-day streak");
  await expect(drawer).toContainText("Get the Solara pet");
  await expect(drawer.getByRole("link", { name: /Limited banner · Hiyuki/ })).toHaveAttribute("href", "/shop?banner=limited_hiyuki");
  await drawer.getByRole("link", { name: "See all tournaments" }).click();
  await expect(page).toHaveURL(/\/events$/);
  await expect(drawer).toBeHidden();
});
