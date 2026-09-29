import { expect, test, type Browser, type Page } from "@playwright/test";
import { io } from "socket.io-client";
import { API_URL, apiCall, onboard, registerVerified, setEnglish, signIn, toast, type TestUser } from "./helpers";

// Chromium's fake mic (a beep) and auto-accepted permission prompt.
test.use({ launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] } });

const REALTIME_URL = `${new URL(API_URL).origin}/realtime`;

async function createCaller(prefix: string): Promise<TestUser> {
  const tag = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  const created = await registerVerified(`w10+${tag}@example.com`, `${prefix} ${tag.slice(-6)}`);
  await onboard(created, "valorant");
  return created;
}

/** Request + accept over the API, which creates the conversation. */
async function createConversation(a: TestUser, b: TestUser) {
  const { request } = await apiCall<{ request: { id: string } }>("/match/requests", {
    method: "POST",
    token: a.token,
    body: { type: "PLAYER_TO_PLAYER", receiverId: b.id, game: "valorant" },
  });
  await apiCall(`/match/requests/${request.id}/accept`, { method: "PUT", token: b.token });
  const { conversations } = await apiCall<{ conversations: { id: string; otherParticipant: { id: string } | null }[] }>("/conversations", {
    token: a.token,
  });
  const conversation = conversations.find((item) => item.otherParticipant?.id === b.id);
  if (!conversation) throw new Error("conversation not created");
  return conversation.id;
}

async function openChat(browser: Browser, user: TestUser, other: TestUser, conversationId: string) {
  const context = await browser.newContext({ permissions: ["microphone"] });
  await setEnglish(context);
  const page = await context.newPage();
  await signIn(page, user, "valorant");
  await page.goto(`/inbox?c=${conversationId}`);
  await expect(page.getByRole("heading", { level: 2, name: other.displayName })).toBeVisible();
  return { context, page };
}

async function setup(browser: Browser) {
  const [alice, bob] = await Promise.all([createCaller("W10 Alice"), createCaller("W10 Bob")]);
  const conversationId = await createConversation(alice, bob);
  const a = await openChat(browser, alice, bob, conversationId);
  const b = await openChat(browser, bob, alice, conversationId);
  return { alice, bob, conversationId, pageA: a.page, pageB: b.page, close: () => Promise.all([a.context.close(), b.context.close()]) };
}

const callBar = (page: Page) => page.getByRole("region", { name: "Active call" });
const callButton = (page: Page) => page.getByRole("button", { name: "Voice call" });
const incoming = (page: Page, caller: TestUser) => page.getByRole("alertdialog", { name: `${caller.displayName} is calling` });

test("A calls B, B accepts, both connect, mute toggles and leaving ends the call for both", async ({ browser }) => {
  test.slow();
  const { alice, bob, pageA, pageB, close } = await setup(browser);

  await callButton(pageA).click();
  await expect(callBar(pageA)).toHaveAttribute("data-call-status", "ringing");
  await incoming(pageB, alice).getByRole("button", { name: "Accept" }).click();

  for (const [page, other] of [
    [pageA, bob],
    [pageB, alice],
  ] as const) {
    await expect(callBar(page)).toHaveAttribute("data-call-status", "connected", { timeout: 20_000 });
    const peer = callBar(page).locator(`[data-user-id="${other.id}"]`);
    await expect(peer).toHaveAttribute("data-connection-state", "connected");
    // Quality stats arrive within a few seconds; audio uses Opus with redundancy (RED) so lost packets don't buzz.
    await expect(peer).toHaveAttribute("data-route", "direct", { timeout: 10_000 });
    await expect(peer).toHaveAttribute("data-redundancy", "true");
  }
  await expect(callButton(pageA)).toBeDisabled();

  const aliceOnB = callBar(pageB).locator(`[data-user-id="${alice.id}"]`);
  await callBar(pageA).getByRole("button", { name: "Mute" }).click();
  await expect(callBar(pageA).getByRole("button", { name: "Unmute" })).toHaveAttribute("aria-pressed", "true");
  await expect(aliceOnB).toHaveAttribute("data-muted", "true");
  await callBar(pageA).getByRole("button", { name: "Unmute" }).click();
  await expect(callBar(pageA).getByRole("button", { name: "Mute" })).toHaveAttribute("aria-pressed", "false");
  await expect(aliceOnB).not.toHaveAttribute("data-muted", /.*/);

  await callBar(pageA).getByRole("button", { name: "Leave call" }).click();
  await expect(callBar(pageA)).toBeHidden();
  await expect(callBar(pageB)).toBeHidden();
  await expect(toast(pageB, "Call ended")).toBeVisible();
  await expect(callButton(pageA)).toBeEnabled();

  await close();
});

test("blocking mid-call ends the call on the server for both", async ({ browser }) => {
  test.slow();
  const { alice, bob, pageA, pageB, close } = await setup(browser);

  await callButton(pageA).click();
  await incoming(pageB, alice).getByRole("button", { name: "Accept" }).click();
  await expect(callBar(pageA)).toHaveAttribute("data-call-status", "connected", { timeout: 20_000 });

  // Block over the API, so only the server can end the call.
  await apiCall("/blocks", { method: "POST", token: alice.token, body: { userId: bob.id } });
  await expect(callBar(pageA)).toBeHidden();
  await expect(callBar(pageB)).toBeHidden();

  await close();
});

test("declining ends the call for the caller", async ({ browser }) => {
  test.slow();
  const { alice, pageA, pageB, close } = await setup(browser);

  await callButton(pageA).click();
  const card = incoming(pageB, alice);
  await card.getByRole("button", { name: "Decline" }).click();
  await expect(card).toBeHidden();
  await expect(callBar(pageA)).toBeHidden();
  await expect(toast(pageA, "Call declined")).toBeVisible();

  await close();
});

test("a blocked pair can't call or message, in the UI or over the socket", async ({ browser }) => {
  test.slow();
  const [alice, bob] = await Promise.all([createCaller("W10 Alice"), createCaller("W10 Bob")]);
  const conversationId = await createConversation(alice, bob);
  await apiCall("/blocks", { method: "POST", token: alice.token, body: { userId: bob.id } });

  const a = await openChat(browser, alice, bob, conversationId);
  await expect(callButton(a.page)).toBeDisabled();
  await expect(a.page.getByRole("textbox", { name: "Message", exact: true })).toBeDisabled();
  await expect(a.page.getByText("You blocked this user. Unblock to message.")).toBeVisible();

  const b = await openChat(browser, bob, alice, conversationId);
  await expect(callButton(b.page)).toBeDisabled();
  await expect(b.page.getByRole("textbox", { name: "Message", exact: true })).toBeDisabled();
  await expect(b.page.getByText("You can't message this user")).toBeVisible();

  // The server enforces it too, whatever the UI does.
  for (const user of [alice, bob]) {
    const socket = io(REALTIME_URL, { auth: { token: user.token }, transports: ["websocket"] });
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", () => resolve());
      socket.once("connect_error", reject);
    });
    const ack = await socket.timeout(5_000).emitWithAck("call:start", { conversationId });
    expect(ack).toEqual({ ok: false, reason: "blocked" });
    socket.disconnect();
  }

  // Per-socket cap on call events: a burst past 60 is refused.
  const socket = io(REALTIME_URL, { auth: { token: alice.token }, transports: ["websocket"] });
  await new Promise<void>((resolve) => socket.once("connect", () => resolve()));
  const acks = await Promise.all(Array.from({ length: 70 }, () => socket.timeout(5_000).emitWithAck("call:sync", {})));
  expect(acks.filter((ack) => ack.reason === "rate_limited").length).toBeGreaterThan(0);
  socket.disconnect();

  await Promise.all([a.context.close(), b.context.close()]);
});
