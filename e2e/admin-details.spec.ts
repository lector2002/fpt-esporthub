import { expect, test } from "@playwright/test";
import { apiCall, createPlayer, loginUser, SEEDED_ADMIN, setEnglish, signIn, uniqueTag } from "./helpers";

const LOL = "league_of_legends";

test.beforeEach(async ({ context, page }) => {
  await setEnglish(context);
  await page.setViewportSize({ width: 1440, height: 900 });
});

async function teamWithActivity() {
  const [captain, applicant, reporter] = await Promise.all([createPlayer("E2E DCap", [LOL]), createPlayer("E2E DApp", [LOL]), createPlayer("E2E DRep", [LOL])]);
  const name = `E2E Detail ${uniqueTag()}`;
  const created = await apiCall<{ team?: { id: string }; id?: string }>("/teams", {
    method: "POST",
    token: captain.token,
    body: { name, game: LOL, rankMin: "Silver", rankMax: "Platinum", neededRoles: ["top"], schedule: ["weekend"], goals: ["rank_climb"], communicationStyle: "chill" },
  });
  const teamId = created.team?.id ?? created.id!;
  await apiCall("/match/requests", { method: "POST", token: applicant.token, body: { type: "PLAYER_TO_TEAM", teamId, game: LOL } });
  await apiCall("/reports", { method: "POST", token: reporter.token, body: { targetType: "team", targetId: teamId, reason: "toxicity" } });
  return { name, teamId, captain, applicant };
}

test("an admin opens a team and sees its roster, join requests and reports", async ({ page }) => {
  const [team, admin] = await Promise.all([teamWithActivity(), loginUser(SEEDED_ADMIN.email, SEEDED_ADMIN.password)]);
  await signIn(page, admin);
  await page.goto("/admin/teams");
  await page.getByPlaceholder(/Search/).fill(team.name);
  await page.keyboard.press("Enter");
  const row = page.getByRole("row").filter({ hasText: team.name });

  // The switch in the row still works on its own, without opening the team.
  await row.getByRole("switch").click();
  await expect(row.getByRole("switch")).not.toBeChecked();
  await expect(page).toHaveURL(/\/admin\/teams$/);

  await row.click();
  await expect(page).toHaveURL(new RegExp(`/admin/teams/${team.teamId}$`));
  await expect(page.getByRole("heading", { level: 1, name: team.name })).toBeVisible();
  await expect(page.getByRole("switch")).not.toBeChecked();
  const roster = page.locator("[data-slot=card]").filter({ hasText: "Roster" });
  await expect(roster.getByRole("link", { name: team.captain.displayName })).toBeVisible();
  const requests = page.locator("[data-slot=card]").filter({ hasText: "Join requests and invites" });
  await expect(requests.getByRole("listitem").filter({ hasText: team.applicant.displayName })).toContainText("Asked to join");
  await expect(requests.getByRole("listitem").filter({ hasText: team.applicant.displayName })).toContainText("Pending");
  await expect(page.locator("[data-slot=card]").filter({ hasText: "Reports about this team" })).toContainText("Toxic");

  await page.getByRole("link", { name: "Back to teams" }).click();
  await expect(page).toHaveURL(/\/admin\/teams$/);
});

async function cupWithEntries(admin: { token: string }) {
  const [host, captainA, captainB] = await Promise.all([createPlayer("E2E DHost", [LOL]), createPlayer("E2E DCapA", [LOL]), createPlayer("E2E DCapB", [LOL])]);
  const venue = await apiCall<{ id: string; name: string }>("/venues", { method: "POST", token: host.token, body: { name: `E2E Detail Cafe ${uniqueTag()}`, address: "1 Test Street", city: "Hanoi", pcCount: 40 } });
  await apiCall(`/admin/venues/${venue.id}/review`, { method: "PUT", token: admin.token, body: { status: "APPROVED" } });
  const title = `E2E Detail Cup ${uniqueTag()}`;
  const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { id: cupId } = await apiCall<{ id: string }>("/offline-tournaments", {
    method: "POST",
    token: host.token,
    body: { title, game: LOL, format: "SINGLE_ELIMINATION", teamSize: 1, maxTeams: 4, bestOf: 1, finalBestOf: 1, entryFee: 50000, startsAt },
  });
  const teams: string[] = [];
  for (const captain of [captainA, captainB]) {
    const teamName = `E2E DT ${uniqueTag()}`;
    const team = await apiCall<{ team?: { id: string }; id?: string }>("/teams", {
      method: "POST",
      token: captain.token,
      body: { name: teamName, game: LOL, rankMin: "Silver", rankMax: "Platinum", neededRoles: ["top"], schedule: ["weekend"], goals: ["rank_climb"], communicationStyle: "chill" },
    });
    await apiCall(`/offline-tournaments/${cupId}/entries`, { method: "POST", token: captain.token, body: { teamId: team.team?.id ?? team.id, playerIds: [captain.id] } });
    teams.push(teamName);
  }
  const detail = await apiCall<{ entries: { id: string; teamName: string }[] }>(`/offline-tournaments/${cupId}`, { token: host.token });
  const paidEntry = detail.entries.find((entry) => entry.teamName === teams[0])!;
  await apiCall(`/offline-tournaments/${cupId}/entries/${paidEntry.id}`, { method: "PUT", token: host.token, body: { paid: true } });
  return { cupId, title, teams, host, venue };
}

test("an admin opens a venue cup and sees entries, payments and the host", async ({ page }) => {
  const admin = await loginUser(SEEDED_ADMIN.email, SEEDED_ADMIN.password);
  const cup = await cupWithEntries(admin);
  await signIn(page, admin);
  await page.goto("/admin");
  await page.getByRole("navigation", { name: "Admin console" }).getByRole("link", { name: "Venue cups" }).click();
  await page.getByPlaceholder("Search cup or venue").fill(cup.title);
  await page.keyboard.press("Enter");
  await page.getByRole("row").filter({ hasText: cup.title }).click();

  await expect(page).toHaveURL(new RegExp(`/admin/cups/${cup.cupId}$`));
  await expect(page.getByRole("heading", { level: 1, name: cup.title })).toBeVisible();
  await expect(page.getByRole("link", { name: cup.host.displayName })).toBeVisible();
  await expect(page.locator("[data-slot=card]").filter({ hasText: "Entry fees collected" })).toContainText(/50[.,]000/);
  const entries = page.locator("[data-slot=card]").filter({ has: page.getByText("Teams", { exact: true }) });
  await expect(entries.getByRole("listitem").filter({ hasText: cup.teams[0] })).toContainText("Paid");
  await expect(entries.getByRole("listitem").filter({ hasText: cup.teams[1] })).toContainText("Not paid");
  await expect(page.getByText("The bracket appears once the cup starts")).toBeVisible();

  // An entry's team opens that team's admin page.
  await entries.getByRole("link", { name: cup.teams[0] }).click();
  await expect(page.getByRole("heading", { level: 1, name: cup.teams[0] })).toBeVisible();
  await expect(page.locator("[data-slot=card]").filter({ hasText: "Cups entered" })).toContainText(cup.title);
});

test("an admin opens a venue from the list and from its cup", async ({ page }) => {
  const admin = await loginUser(SEEDED_ADMIN.email, SEEDED_ADMIN.password);
  const cup = await cupWithEntries(admin);
  await signIn(page, admin);
  await page.goto("/admin/venues");
  await page.getByRole("radio", { name: "All" }).click();
  await page.getByRole("row").filter({ hasText: cup.venue.name }).click();

  await expect(page).toHaveURL(new RegExp(`/admin/venues/${cup.venue.id}$`));
  await expect(page.getByRole("heading", { level: 1, name: cup.venue.name })).toBeVisible();
  await expect(page.getByRole("link", { name: cup.host.displayName })).toBeVisible();
  await expect(page.locator("[data-slot=card]").filter({ hasText: "Entry fees collected" })).toContainText(/50[.,]000/);
  const cups = page.locator("[data-slot=card]").filter({ has: page.getByText("Cups hosted", { exact: true }) }).last();
  await expect(cups.getByRole("listitem").filter({ hasText: cup.title })).toContainText("2/4 teams");

  await cups.getByRole("link", { name: cup.title }).click();
  await expect(page.getByRole("heading", { level: 1, name: cup.title })).toBeVisible();
  await page.getByRole("link", { name: cup.venue.name }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/venues/${cup.venue.id}$`));
});

test("an admin approves a coach from the list, then opens their sessions", async ({ page }) => {
  const [admin, coachUser, player] = await Promise.all([loginUser(SEEDED_ADMIN.email, SEEDED_ADMIN.password), createPlayer("E2E DCoach", [LOL]), createPlayer("E2E DStudent", [LOL])]);
  const { coach } = await apiCall<{ coach: { id: string } }>("/coaching/coaches/me", {
    method: "POST",
    token: coachUser.token,
    body: { game: LOL, specialties: ["Laning"], hourlyRate: 100000, bio: "Detail page coach for the admin console test.", availability: ["weekend"] },
  });

  await signIn(page, admin);
  await page.goto("/admin/coaches");
  const row = page.getByRole("row").filter({ hasText: coachUser.displayName });
  // Approve stays on the list instead of opening the coach.
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Listing updated")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/coaches$/);

  await apiCall("/coaching/requests", {
    method: "POST",
    token: player.token,
    body: { coachId: coach.id, proposedStartAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), durationMinutes: 60, proposedPrice: 100000, message: "Help me climb" },
  });
  await page.getByRole("radio", { name: "All" }).click();
  await row.click();
  await expect(page).toHaveURL(new RegExp(`/admin/coaches/${coach.id}$`));
  await expect(page.getByRole("heading", { level: 1, name: coachUser.displayName })).toContainText("Approved");
  const sessions = page.locator("[data-slot=card]").filter({ has: page.getByText("Sessions", { exact: true }) });
  await expect(sessions.getByRole("listitem").filter({ hasText: player.displayName })).toContainText("Pending");
  await expect(page.getByRole("link", { name: "Open public page" })).toBeVisible();
  await page.getByRole("link", { name: "Open account" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/users/${coachUser.id}$`));
});

test("an admin opens a community and sees its members and channel activity", async ({ page }) => {
  const [admin, owner, member] = await Promise.all([loginUser(SEEDED_ADMIN.email, SEEDED_ADMIN.password), createPlayer("E2E DOwner"), createPlayer("E2E DMember")]);
  const name = `E2E Hub ${uniqueTag()}`.slice(0, 40);
  const { community } = await apiCall<{ community: { id: string; channels: { name: string; kind: string; conversationId: string | null }[] } }>("/communities", {
    method: "POST",
    token: owner.token,
    body: { name, description: "Admin detail test hub", game: "valorant" },
  });
  await apiCall(`/communities/${community.id}/join`, { method: "POST", token: member.token });
  const general = community.channels.find((channel) => channel.kind === "text")!;
  await apiCall(`/conversations/${general.conversationId}/messages`, { method: "POST", token: owner.token, body: { content: "welcome" } });

  await signIn(page, admin);
  await page.goto("/admin");
  await page.getByRole("navigation", { name: "Admin console" }).getByRole("link", { name: "Communities" }).click();
  await page.getByPlaceholder("Search community name").fill(name);
  await page.keyboard.press("Enter");
  await page.getByRole("row").filter({ hasText: name }).click();

  await expect(page).toHaveURL(new RegExp(`/admin/communities/${community.id}$`));
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.locator("[data-slot=card]").filter({ hasText: "Messages" }).first()).toContainText("1");
  const channels = page.locator("[data-slot=card]").filter({ has: page.getByText("Channels", { exact: true }) }).last();
  await expect(channels.getByRole("listitem").filter({ hasText: general.name })).toContainText("1 messages");
  const members = page.locator("[data-slot=card]").filter({ has: page.getByText("Members", { exact: true }) }).last();
  await expect(members.getByRole("listitem").filter({ hasText: owner.displayName })).toContainText("Owner");
  await members.getByRole("link", { name: member.displayName }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/users/${member.id}$`));
  await apiCall(`/communities/${community.id}`, { method: "DELETE", token: owner.token });
});

test("an admin opens an event and sees who is interested", async ({ page }) => {
  const [admin, fan] = await Promise.all([loginUser(SEEDED_ADMIN.email, SEEDED_ADMIN.password), createPlayer("E2E DFan")]);
  const title = `E2E Detail Event ${uniqueTag()}`;
  const day = 24 * 60 * 60 * 1000;
  const { event } = await apiCall<{ event: { id: string } }>("/tournaments", {
    method: "POST",
    token: admin.token,
    body: { title, game: "valorant", organizer: "E2E Org", startsAt: new Date(Date.now() + 14 * day).toISOString(), deadlineAt: new Date(Date.now() + 7 * day).toISOString() },
  });
  await apiCall(`/tournaments/${event.id}/interest`, { method: "POST", token: fan.token });

  await signIn(page, admin);
  await page.goto("/admin/events");
  await page.getByRole("listitem").filter({ hasText: title }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/events/${event.id}$`));
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.locator("[data-slot=card]").filter({ hasText: "Interested players" }).getByRole("link", { name: fan.displayName })).toBeVisible();

  // Edit still opens its dialog on the list instead of the detail page.
  await page.getByRole("link", { name: "Back to events" }).click();
  await page.getByRole("listitem").filter({ hasText: title }).getByRole("button", { name: "Edit" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/events$/);
  await apiCall(`/tournaments/${event.id}`, { method: "DELETE", token: admin.token });
});
