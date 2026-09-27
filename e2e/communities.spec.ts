import { expect, test, type Browser, type Page } from "@playwright/test";
import { apiCall, createPlayer, setEnglish, signIn, uniqueTag, type TestUser } from "./helpers";

// Chromium's fake mic (a beep) and auto-accepted permission prompt.
test.use({ launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] } });

type Detail = { community: { id: string; channels: { id: string; name: string; kind: "text" | "voice" }[] } };

async function openAs(browser: Browser, user: TestUser, path: string) {
  const context = await browser.newContext({ permissions: ["microphone"], viewport: { width: 1440, height: 900 } });
  await setEnglish(context);
  const page = await context.newPage();
  await signIn(page, user, "valorant");
  await page.goto(path);
  return { context, page };
}

const occupant = (page: Page, channelId: string, user: TestUser) =>
  page.locator(`[data-voice-room="${channelId}"]`).getByRole("list", { name: "In voice" }).locator(`[data-user-id="${user.id}"]`);
const channelTab = (page: Page, name: string) => page.getByRole("navigation", { name: "Text channels" }).getByRole("button", { name, exact: true });

test("a community has text channels and join-anytime voice rooms: create, preview, join, chat, voice, channels, leave", async ({ browser }) => {
  test.slow();
  const [owner, member] = await Promise.all([createPlayer("Hub Owner"), createPlayer("Hub Member")]);
  const name = `Hub ${uniqueTag()}`.slice(0, 40);

  // The owner creates it from the discover page and lands in the default text channel.
  const a = await openAs(browser, owner, "/communities");
  await a.page.getByRole("button", { name: "Create community" }).first().click();
  const dialog = a.page.getByRole("dialog");
  await dialog.getByLabel("Community name").fill(name);
  await dialog.getByLabel("About").fill("Nightly Valorant stacks");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(a.page).toHaveURL(/\/communities\/[^/?]+$/);
  await expect(a.page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(channelTab(a.page, "chung")).toHaveAttribute("aria-current", "page");
  const id = a.page.url().split("/communities/")[1];
  const { community } = await apiCall<Detail>(`/communities/${id}`, { token: owner.token });
  const lobby = community.channels.find((channel) => channel.kind === "voice")!;

  // Someone else previews it without the chat, then joins.
  const b = await openAs(browser, member, `/communities/${id}`);
  await expect(b.page.getByText(`You're previewing ${name}`)).toBeVisible();
  await expect(b.page.getByPlaceholder("Message #chung")).toHaveCount(0);
  await b.page.getByRole("button", { name: "Join", exact: true }).first().click();
  await expect(b.page.getByPlaceholder("Message #chung")).toBeVisible();

  // Text channel: messages reach the other member with the sender's name.
  await a.page.getByPlaceholder("Message #chung").fill("stack tonight?");
  await a.page.keyboard.press("Enter");
  const log = b.page.getByRole("log");
  await expect(log.getByText("stack tonight?")).toBeVisible();
  await expect(log.getByText(owner.displayName, { exact: true })).toBeVisible();

  // Voice channel: join anytime, everyone sees who is inside.
  await a.page.locator(`[data-voice-channel="${lobby.id}"]`).click();
  await expect(a.page.locator(`[data-voice-room="${lobby.id}"]`).getByRole("region", { name: "Active call" }).getByText("Voice connected")).toBeVisible();
  await expect(occupant(b.page, lobby.id, owner)).toBeVisible();
  await b.page.locator(`[data-voice-channel="${lobby.id}"]`).click();
  await expect(occupant(a.page, lobby.id, member)).toHaveAttribute("data-connection-state", "connected", { timeout: 20_000 });

  // The owner adds a text channel; its name is tidied like Discord's.
  await a.page.getByRole("button", { name: "Add text channel" }).click();
  await a.page.getByRole("dialog").getByLabel("Channel name").fill("Clip Hay");
  await a.page.getByRole("dialog").getByRole("button", { name: "Add channel" }).click();
  await channelTab(a.page, "clip-hay").click();
  await expect(channelTab(a.page, "clip-hay")).toHaveAttribute("aria-current", "page");
  await expect(a.page.getByText("Welcome to #clip-hay")).toBeVisible();
  await expect(a.page).toHaveURL(/\?channel=/);

  // Leaving drops the member out of voice for everyone and back to discover.
  await b.page.getByRole("button", { name: "Leave community" }).click();
  await b.page.getByRole("alertdialog").getByRole("button", { name: "Leave community" }).click();
  await expect(b.page).toHaveURL(/\/communities$/);
  await expect(occupant(a.page, lobby.id, member)).toBeHidden();

  // Channel chats stay out of the inbox.
  const inbox = await apiCall<{ conversations: unknown[] }>("/conversations", { token: owner.token });
  expect(inbox.conversations).toHaveLength(0);

  await Promise.all([a.context.close(), b.context.close()]);
  await apiCall(`/communities/${id}`, { method: "DELETE", token: owner.token });
});
