import { expect, test } from "@playwright/test";
import { apiCall, createPlayer, setEnglish, signIn } from "./helpers";

const LOL = "league_of_legends";

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("booking a coach shows the credits held against the wallet, with a top-up link when short", async ({ page }) => {
  const player = await createPlayer("E2E Coachee", [LOL]);
  const wallet = await apiCall<{ balance: number; coachingInCredits: boolean; packages: { credits: number; amountVnd: number }[] }>("/credits/me", { token: player.token });
  test.skip(!wallet.coachingInCredits, "Needs the API running with CREDITS_COACHING=true");
  const { coaches } = await apiCall<{ coaches: { id: string }[] }>(`/coaching/coaches?game=${LOL}`, { token: player.token });
  test.skip(coaches.length === 0, "Needs a seeded LoL coach");

  await signIn(page, player, LOL);
  await page.goto(`/coaches/${coaches[0].id}`);
  await page.getByRole("button", { name: "Book a session" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Proposed price (VND)").fill("50000");

  const pack = wallet.packages[0];
  const hold = Math.ceil(50000 / (pack.amountVnd / pack.credits));
  const line = dialog.getByTestId("coaching-hold");
  await expect(line).toContainText(`${hold} credits held when agreed · Wallet: ${wallet.balance}`);
  await expect(line.getByRole("link", { name: `Top up ${hold - wallet.balance}` })).toHaveAttribute("href", "/wallet");
});

test("a new coach builds a listing from suggestions and sees it live in the card preview", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const player = await createPlayer("E2E NewCoach", [LOL]);
  await signIn(page, player, LOL);
  await page.goto("/coaches/me");

  await expect(page.getByRole("heading", { level: 1, name: "Become a coach" })).toBeVisible();
  const preview = page.getByTestId("coach-preview");
  await page.getByRole("button", { name: "Laning" }).click();
  await page.getByRole("button", { name: "Macro" }).click();
  await page.getByRole("button", { name: "Tue evening" }).click();
  await page.getByRole("button", { name: /^150\.000/ }).click();
  await expect(page.getByLabel("Hourly rate (VND)")).toHaveValue("150000");
  await expect(page.getByText(/30-minute session: 75\.000/)).toBeVisible();
  await expect(preview.getByText("Laning")).toBeVisible();
  await expect(preview.getByText("Tue evening")).toBeVisible();
  await expect(preview.getByText(/150\.000/)).toBeVisible();
  // Picked suggestions leave the suggestion row.
  await expect(page.getByRole("button", { name: "Laning", exact: true })).toHaveCount(0);

  await page.getByLabel("Bio").fill("Five seasons of solo queue, I review your games and fix your laning.");
  await page.getByRole("button", { name: "Create coach profile" }).click();
  await expect(page.getByText("Coach profile saved")).toBeVisible();
  await expect(page.getByText("Waiting for review")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Coach profile" })).toBeVisible();
});
