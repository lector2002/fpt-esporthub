import { expect, test, type Page } from "@playwright/test";
import { cardFor, createPlayer, matchCardFor, setEnglish, signIn, toast } from "./helpers";

function conversationLink(page: Page, name: string) {
  return page.locator('a[href^="/inbox?c="]').filter({ hasText: name });
}

test("player request is accepted and a chat message arrives live for the other player", async ({ browser }) => {
  test.slow();
  const [alice, bob] = await Promise.all([createPlayer("E2E Alice"), createPlayer("E2E Bob")]);

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  await Promise.all([setEnglish(contextA), setEnglish(contextB)]);
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  await signIn(pageA, alice, "valorant");
  await signIn(pageB, bob, "valorant");

  // A finds B and sends a request.
  await pageA.goto("/find-match");
  const bobCard = await matchCardFor(pageA, bob.displayName);
  await bobCard.getByRole("button", { name: "Invite to play" }).click();
  const dialog = pageA.getByRole("dialog", { name: `Invite ${bob.displayName} to play` });
  await dialog.getByLabel("Message (optional)").fill("Duo tonight?");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(toast(pageA, `Request sent to ${bob.displayName}`)).toBeVisible();
  await expect(bobCard.getByRole("button", { name: "Requested" })).toBeDisabled();

  // B sees it on the requests page and accepts.
  await pageB.goto("/requests");
  await expect(pageB).toHaveURL(/\/inbox\?tab=requests/);
  const request = cardFor(pageB, alice.displayName);
  await expect(request).toContainText("Duo tonight?");
  await request.getByRole("button", { name: "Accept" }).click();
  await expect(toast(pageB, "Request accepted")).toBeVisible();

  // Both see the conversation; B opens it first so B's socket joins the room.
  await pageB.getByRole("tab", { name: /Messages/ }).click();
  await expect(pageB).toHaveURL(/\/inbox$/);
  await conversationLink(pageB, alice.displayName).click();
  await expect(pageB.getByRole("heading", { level: 2, name: alice.displayName })).toBeVisible();

  await pageA.goto("/inbox");
  await conversationLink(pageA, bob.displayName).click();
  await expect(pageA.getByRole("heading", { level: 2, name: bob.displayName })).toBeVisible();

  const text = `gg ${Date.now()}`;
  await pageA.getByRole("textbox", { name: "Message", exact: true }).fill(text);
  await pageA.getByRole("textbox", { name: "Message", exact: true }).press("Enter");
  await expect(pageA.getByRole("log", { name: "Messages" }).getByText(text)).toBeVisible();

  // Delivered to B over Socket.IO, no reload.
  await expect(pageB.getByRole("log", { name: "Messages" }).getByText(text)).toBeVisible();

  await contextA.close();
  await contextB.close();
});
