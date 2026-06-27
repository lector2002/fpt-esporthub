const apiUrl = process.env.API_URL ?? "http://localhost:4000/api/v1";
const email = process.env.SMOKE_EMAIL ?? "minh@fpt.edu.vn";
const password = process.env.SMOKE_PASSWORD ?? "Password123!";

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${options.method ?? "GET"} ${path} -> ${response.status}: ${body}`);
  }

  return response.json();
}

const health = await request("/health");
const login = await request("/auth/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});

const authHeaders = { Authorization: `Bearer ${login.accessToken}` };
const profile = await request("/profiles/me", { headers: authHeaders });
const matches = await request("/match/find", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({ mode: "find_players" }),
});
const teams = await request("/teams", { headers: authHeaders });
const events = await request("/tournaments");

console.log(JSON.stringify({
  health: health.status,
  user: profile.user.displayName,
  playerMatches: matches.matches.length,
  teams: teams.teams.length,
  events: events.events.length,
}, null, 2));
