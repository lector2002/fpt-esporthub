import { expect, test } from "@playwright/test";
import { apiCall, createPlayer, loginUser, SEEDED_ADMIN, setEnglish, signIn, toast } from "./helpers";

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

test("a player agrees to a coach's offer through the credit spend step: top up when short, confirm when not", async ({ page }) => {
  const [player, coachUser, admin] = await Promise.all([createPlayer("E2E Agreer", [LOL]), createPlayer("E2E Offerer", [LOL]), loginUser(SEEDED_ADMIN.email, SEEDED_ADMIN.password)]);
  const wallet = await apiCall<{ coachingInCredits: boolean; packages: { credits: number; amountVnd: number }[] }>("/credits/me", { token: player.token });
  test.skip(!wallet.coachingInCredits, "Needs the API running with CREDITS_COACHING=true");
  const { coach } = await apiCall<{ coach: { id: string } }>("/coaching/coaches/me", {
    method: "POST",
    token: coachUser.token,
    body: { game: LOL, specialties: ["Laning"], hourlyRate: 40000, bio: "Coach who counters offers for the spend test.", availability: ["weekend"] },
  });
  await apiCall(`/admin/coaches/${coach.id}/review`, { method: "PUT", token: admin.token, body: { status: "APPROVED" } });
  const startsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const { request } = await apiCall<{ request: { id: string } }>("/coaching/requests", {
    method: "POST",
    token: player.token,
    body: { coachId: coach.id, proposedStartAt: startsAt, durationMinutes: 60, proposedPrice: 20000, message: "Lane help" },
  });
  await apiCall(`/coaching/requests/${request.id}/counter`, { method: "PUT", token: coachUser.token, body: { proposedStartAt: startsAt, durationMinutes: 60, proposedPrice: 30000, message: "Full hour" } });
  const pack = wallet.packages[0];
  const hold = Math.ceil(30000 / (pack.amountVnd / pack.credits));

  await signIn(page, player, LOL);
  await page.goto("/coaches/sessions");
  await expect(page.getByRole("link", { name: `Top up · need ${hold}` })).toHaveAttribute("href", "/wallet");

  await apiCall("/admin/credits/adjust", { method: "POST", token: admin.token, body: { userId: player.id, amount: hold + 5, note: "e2e coaching agree" } });
  await page.getByRole("button", { name: `Agree · ${hold} credits` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: `Pay ${hold} credits` }).click();
  await expect(toast(page, "Session agreed")).toBeVisible();
  await expect(page.getByTestId("topbar-balance")).toHaveText("5");
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
