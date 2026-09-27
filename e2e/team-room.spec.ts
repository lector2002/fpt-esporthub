import { expect, test, type Browser, type Page } from "@playwright/test";
import { apiCall, createPlayer, setEnglish, signIn, uniqueTag, type TestUser } from "./helpers";

// Chromium's fake mic (a beep) and auto-accepted permission prompt.
test.use({ launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] } });

const LOL = "league_of_legends";

/** Captain's team plus one member who joined through an accepted application. */
async function teamWithMember() {
  const [captain, member] = await Promise.all([createPlayer("Room Cap", [LOL]), createPlayer("Room Mate", [LOL])]);
  const created = await apiCall<{ team?: { id: string; name: string } }>("/teams", {
    method: "POST",
    token: captain.token,
    body: { name: `Room ${uniqueTag()}`.slice(0, 32), game: LOL, rankMin: "Silver", rankMax: "Platinum", neededRoles: ["mid"], schedule: ["weekend"], goals: ["rank_climb"], communicationStyle: "chill" },
  });
  const team = created.team!;
  const { request } = await apiCall<{ request: { id: string } }>("/match/requests", {
    method: "POST",
    token: member.token,
    body: { type: "PLAYER_TO_TEAM", teamId: team.id, game: LOL, message: "let me in" },
  });
  await apiCall(`/match/requests/${request.id}/accept`, { method: "PUT", token: captain.token });
  return { captain, member, team };
}

async function openRoom(browser: Browser, user: TestUser, teamId: string) {
  const context = await browser.newContext({ permissions: ["microphone"], viewport: { width: 1440, height: 900 } });
  await setEnglish(context);
  const page = await context.newPage();
  await signIn(page, user, LOL);
  await page.goto(`/teams/${teamId}/room`);
  await expect(page.getByRole("heading", { level: 2, name: "general" })).toBeVisible();
  return { context, page };
}

const voiceChannel = (page: Page, teamId: string) => page.locator(`[data-voice-channel="${teamId}"]`);
const occupant = (page: Page, user: TestUser) => page.getByRole("list", { name: "In voice" }).locator(`[data-user-id="${user.id}"]`);
const voicePanel = (page: Page) => page.getByRole("region", { name: "Active call" });

test("team room: chat together, drop into voice without ringing, deafen and disconnect", async ({ browser }) => {
  test.slow();
  const { captain, member, team } = await teamWithMember();
  const a = await openRoom(browser, captain, team.id);
  const b = await openRoom(browser, member, team.id);

  // Text channel: both see each other's messages with the sender's name.
  await a.page.getByPlaceholder("Message #general").fill("scrim at 8?");
  await a.page.keyboard.press("Enter");
  const log = b.page.getByRole("log");
  await expect(log.getByText("scrim at 8?")).toBeVisible();
  await expect(log.getByText(captain.displayName, { exact: true })).toBeVisible();

  // Voice: the captain sits in alone; the member sees it and nothing rings.
  await voiceChannel(a.page, team.id).click();
  await expect(voicePanel(a.page).getByText("Voice connected")).toBeVisible();
  await expect(occupant(b.page, captain)).toBeVisible();
  await expect(b.page.getByRole("alertdialog")).toHaveCount(0);
  await expect(b.page.locator(`a[href="/players/${captain.id}"]`).getByLabel("In voice")).toBeVisible();

  await voiceChannel(b.page, team.id).click();
  for (const [page, other] of [
    [a.page, member],
    [b.page, captain],
  ] as const) {
    await expect(occupant(page, other)).toHaveAttribute("data-connection-state", "connected", { timeout: 20_000 });
  }

  // Deafen mutes too, and the other side sees it.
  await voicePanel(a.page).getByRole("button", { name: "Deafen" }).click();
  await expect(voicePanel(a.page).getByRole("button", { name: "Undeafen" })).toHaveAttribute("aria-pressed", "true");
  await expect(occupant(b.page, captain)).toHaveAttribute("data-deafened", "true");
  await expect(occupant(b.page, captain)).toHaveAttribute("data-muted", "true");
  await voicePanel(a.page).getByRole("button", { name: "Undeafen" }).click();
  await expect(occupant(b.page, captain)).not.toHaveAttribute("data-deafened", /.*/);

  // Leaving keeps the room open for whoever is left.
  await voicePanel(b.page).getByRole("button", { name: "Disconnect" }).click();
  await expect(occupant(a.page, member)).toBeHidden();
  await expect(voicePanel(a.page).getByText("Voice connected")).toBeVisible();

  await Promise.all([a.context.close(), b.context.close()]);
});

test("team room is for members only", async ({ page, context }) => {
  const { team } = await teamWithMember();
  const outsider = await createPlayer("Room Out", [LOL]);
  await setEnglish(context);
  await signIn(page, outsider, LOL);
  await page.goto(`/teams/${team.id}/room`);
  await expect(page.getByText("Only team members can open the room")).toBeVisible();
});
