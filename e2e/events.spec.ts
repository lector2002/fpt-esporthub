import { expect, test } from "@playwright/test";
import { apiCall, createPlayer, loginUser, SEEDED_ADMIN, setEnglish, signIn, toast, uniqueTag } from "./helpers";

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

/** "YYYY-MM-DDTHH:mm" for a datetime-local input, `days` from now. */
function localInput(days: number) {
  const date = new Date(Date.now() + days * 86_400_000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

test("an admin adds registration details and players get a real register link", async ({ page, browser }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const title = `E2E Cup ${uniqueTag()}`;
  const admin = await loginUser(SEEDED_ADMIN.email, SEEDED_ADMIN.password);
  await signIn(page, admin);
  await page.goto("/admin/events");
  await page.getByRole("button", { name: "Create event" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByLabel("Organizer").fill("E2E Org");
  await dialog.getByLabel("Starts at").fill(localInput(20));
  await dialog.getByLabel("Registration deadline").fill(localInput(10));
  await dialog.getByLabel("Registration link (optional)").fill("javascript:alert(1)");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("The link must start with https://")).toBeVisible();

  await dialog.getByLabel("Registration link (optional)").fill("https://example.com/register");
  await dialog.getByLabel("Format (optional)").fill("BO1 groups");
  await dialog.getByLabel("Players per team").fill("5");
  await dialog.getByLabel("Prize (optional)").fill("10.000.000đ");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(toast(page, "Event saved")).toBeVisible();

  const player = await createPlayer("E2E Cup Fan");
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await setEnglish(context);
  const playerPage = await context.newPage();
  await signIn(playerPage, player, "valorant");
  await playerPage.goto("/events");
  const card = playerPage.locator('[data-slot="card"]').filter({ has: playerPage.getByRole("link", { name: title }) });
  await expect(card).toContainText("5v5 · BO1 groups");
  await expect(card).toContainText("10.000.000đ");
  const register = card.getByRole("link", { name: "Register" });
  await expect(register).toHaveAttribute("href", "https://example.com/register");
  await expect(register).toHaveAttribute("target", "_blank");
  await card.getByRole("button", { name: "Find a team for this" }).click();
  await expect(toast(playerPage, "You're now listed as looking for a team")).toBeVisible();
  await context.close();

  const { events } = await apiCall<{ events: { id: string; title: string }[] }>("/tournaments?game=valorant", { token: admin.token });
  const created = events.find((event) => event.title === title);
  if (created) await apiCall(`/tournaments/${created.id}`, { method: "DELETE", token: admin.token });
});
