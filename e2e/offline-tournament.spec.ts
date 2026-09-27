import { expect, test } from "@playwright/test";
import { SEEDED_ADMIN, apiCall, createPlayer, loginUser, setEnglish, signIn, toast, uniqueTag, type TestUser } from "./helpers";

const LOL = "league_of_legends";

type Detail = {
  entries: { id: string; captainId: string; teamName: string }[];
  matches: { id: string; status: string; entryAId: string | null; entryBId: string | null; bestOf: number; nextMatchKey: string | null }[];
  myCheckIn: { code: string } | null;
};

async function approvedHost() {
  const host = await createPlayer("E2E Host", [LOL]);
  const venue = await apiCall<{ id: string }>("/venues", {
    method: "POST",
    token: host.token,
    body: { name: `E2E Cyber ${uniqueTag()}`, address: "1 Test Street", city: "Hanoi", pcCount: 40 },
  });
  const admin = await loginUser(SEEDED_ADMIN.email);
  await apiCall(`/admin/venues/${venue.id}/review`, { method: "PUT", token: admin.token, body: { status: "APPROVED" } });
  return host;
}

async function captainWithTeam() {
  const captain = await createPlayer("E2E Cap", [LOL]);
  const team = await apiCall<{ team?: { id: string }; id?: string }>("/teams", {
    method: "POST",
    token: captain.token,
    body: { name: `E2E Team ${uniqueTag()}`, game: LOL, rankMin: "Silver", rankMax: "Platinum", neededRoles: ["top"], schedule: ["weekend"], goals: ["rank_climb"], communicationStyle: "chill" },
  });
  return { ...captain, teamId: team.team?.id ?? team.id! };
}

test.beforeEach(async ({ context }) => {
  await setEnglish(context);
});

test("a venue hosts an offline cup: register, QR check-in, start, captain report, host result, TV champion", async ({ page, browser }) => {
  test.slow();
  const host = await approvedHost();
  const captains = await Promise.all([captainWithTeam(), captainWithTeam(), captainWithTeam(), captainWithTeam()]);

  // Host creates the tournament.
  await signIn(page, host, LOL);
  await page.goto("/host");
  await page.getByRole("link", { name: "New tournament" }).click();
  await page.getByLabel("Title").fill("E2E Cyber Cup");
  await page.getByLabel("Players per team").click();
  await page.getByRole("option", { name: "1", exact: true }).click();
  await page.getByLabel("Max teams").fill("4");
  await page.getByRole("button", { name: "Create tournament" }).click();
  await expect(toast(page, "Tournament created")).toBeVisible();
  await expect(page).toHaveURL(/\/host\/tournaments\/(?!new$)[^/]+$/);
  const id = page.url().split("/").pop()!;

  // First captain registers from the tournament page; the others through the API.
  const captainContext = await browser.newContext();
  await setEnglish(captainContext);
  const captainPage = await captainContext.newPage();
  await signIn(captainPage, captains[0], LOL);
  await captainPage.goto(`/tournaments/${id}`);
  await captainPage.getByRole("button", { name: "Register team" }).click();
  await captainPage.getByRole("dialog").getByRole("button", { name: "Register team" }).click();
  await expect(toast(captainPage, "Team registered")).toBeVisible();
  await expect(captainPage.getByText("Your check-in code")).toBeVisible();
  for (const captain of captains.slice(1)) {
    await apiCall(`/offline-tournaments/${id}/entries`, { method: "POST", token: captain.token, body: { teamId: captain.teamId, playerIds: [captain.id] } });
  }

  // Host opens check-in and scans the first captain's QR link; the rest check in through the API.
  await page.reload();
  await page.getByRole("button", { name: "Open check-in" }).click();
  await expect(toast(page, "Status updated")).toBeVisible();
  const codes = await Promise.all(
    captains.map((captain) => apiCall<Detail>(`/offline-tournaments/${id}`, { token: captain.token }).then((detail) => detail.myCheckIn!.code)),
  );
  await page.goto(`/host/check-in?code=${codes[0]}`);
  await expect(page.getByText(/checked in for E2E Team/)).toBeVisible();
  await expect(page.getByText("Team is fully checked in")).toBeVisible();
  for (const code of codes.slice(1)) {
    await apiCall("/offline-tournaments/check-in", { method: "POST", token: host.token, body: { code } });
  }

  // Start: seeds 4 teams into 2 semifinals and a final.
  await page.goto(`/host/tournaments/${id}`);
  await page.getByRole("button", { name: "Start tournament" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Start tournament" }).click();
  await expect(toast(page, "Bracket created")).toBeVisible();

  let detail = await apiCall<Detail>(`/offline-tournaments/${id}`, { token: host.token });
  const nameOf = (entryId: string | null) => detail.entries.find((entry) => entry.id === entryId)!.teamName;
  const tokenOf = (entryId: string | null) => captains.find((c) => c.id === detail.entries.find((e) => e.id === entryId)!.captainId)!.token;
  const entryOf = (captain: TestUser) => detail.entries.find((entry) => entry.captainId === captain.id)!.id;
  const semis = detail.matches.filter((match) => match.status === "READY");
  expect(semis).toHaveLength(2);
  const mine = semis.find((match) => match.entryAId === entryOf(captains[0]) || match.entryBId === entryOf(captains[0]))!;
  const other = semis.find((match) => match !== mine)!;

  // Captain reports in the app; the opponent confirms the same score, which settles the match.
  await captainPage.reload();
  await captainPage.getByRole("button", { name: "Report result" }).click();
  await captainPage.getByRole("dialog").getByRole("radio", { name: `${nameOf(mine.entryAId)} 1` }).click();
  await captainPage.getByRole("dialog").getByRole("button", { name: "Submit" }).click();
  await expect(toast(captainPage, "Result sent")).toBeVisible();
  const opponentEntry = mine.entryAId === entryOf(captains[0]) ? mine.entryBId : mine.entryAId;
  await apiCall(`/offline-tournaments/matches/${mine.id}/report`, { method: "POST", token: tokenOf(opponentEntry), body: { scoreA: 1, scoreB: 0 } });

  // Host enters the other semifinal from the bracket.
  await page.reload();
  await page.getByRole("button", { name: `${nameOf(other.entryAId)} - ${nameOf(other.entryBId)}` }).click();
  await page.getByRole("dialog").getByRole("radio", { name: `${nameOf(other.entryBId)} 1` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submit" }).click();
  await expect(toast(page, "Result saved")).toBeVisible();

  detail = await apiCall<Detail>(`/offline-tournaments/${id}`, { token: host.token });
  const final = detail.matches.find((match) => match.nextMatchKey === null)!;
  expect(final.status).toBe("READY");
  expect([final.entryAId, final.entryBId].sort()).toEqual([mine.entryAId, other.entryBId].sort());
  await apiCall(`/offline-tournaments/matches/${final.id}/result`, { method: "POST", token: host.token, body: { scoreA: 2, scoreB: 1 } });

  // The venue TV needs no sign-in and shows the champion.
  const tvContext = await browser.newContext();
  await setEnglish(tvContext);
  const tv = await tvContext.newPage();
  await tv.goto(`/tv/tournaments/${id}`);
  await expect(tv.getByRole("heading", { name: "E2E Cyber Cup" })).toBeVisible();
  await expect(tv.getByText("Champion", { exact: true })).toBeVisible();
  await expect(tv.getByText(nameOf(final.entryAId)).first()).toBeVisible();
  await captainContext.close();
  await tvContext.close();
});
