"use client";

import { useEffect, useState } from "react";
import { getDashboardView } from "lib/api";
import type { DashboardCombatProfile, DashboardView } from "lib/types";

type GameKey = "lol" | "val";

function gameLabel(game: GameKey) {
  return game === "lol" ? "LoL" : "Valorant";
}

function gameIcon(game: GameKey) {
  return game === "lol" ? "⚔️" : "🔫";
}

function pillClass(cls: DashboardCombatProfile["pills"][number]["cls"]) {
  if (cls === "val") return "dash-pill-val";
  if (cls === "goal") return "dash-pill-goal";
  return "dash-pill-lol";
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardView | null>(null);
  const [activeGame, setActiveGame] = useState<GameKey>("lol");

  useEffect(() => {
    async function loadDashboard() {
      const nextDashboard = await getDashboardView();
      setDashboard(nextDashboard);
      setActiveGame(nextDashboard.activeGame);
    }
    void loadDashboard();
  }, []);

  if (!dashboard) {
    return <main className="dashboard-shell"><section className="dashboard-card dashboard-loading">Đang tải dashboard...</section></main>;
  }

  const activeProfile = dashboard.profiles[activeGame];
  const activeLabel = gameLabel(activeGame);

  return (
    <main className="dashboard-shell dashboard-grid-bg">
      <div className="dashboard-switcher">
        <button type="button" onClick={() => setActiveGame("lol")} className={`dashboard-toggle ${activeGame === "lol" ? "active lol" : ""}`}>⚔️ League of Legends</button>
        <button type="button" onClick={() => setActiveGame("val")} className={`dashboard-toggle ${activeGame === "val" ? "active val" : ""}`}>🔫 Valorant</button>
      </div>

      <section className={`dashboard-hero dashboard-card ${activeGame === "lol" ? "lol" : "val"}`}>
        <div className="dashboard-avatar-block">
          <div className={`dashboard-avatar ${activeGame}`}>{dashboard.avatarEmoji}</div>
          <div className="dashboard-status"><span />Đang tìm team</div>
        </div>

        <div className="dashboard-identity">
          <span className={`dashboard-kicker ${activeGame}`}>DAILY {activeLabel} BRIEF</span>
          <div className="dashboard-title-row">
            <h1>{dashboard.displayName}</h1>
            <div className="dashboard-badges">
              <span className={activeGame === "lol" ? "lol" : "val"}>✅ {activeLabel} Verified</span>
              <span>🛡️ Trusted</span>
            </div>
          </div>
          <p>"{activeProfile.bio}"</p>

          <div className="dashboard-mini-stats">
            <MiniStat label="Rank" value={activeProfile.rank} tone={activeGame} />
            <MiniStat label="Main Role" value={activeProfile.role} />
            <MiniStat label="Match Score" value={`${activeProfile.matchScore}%`} gradient />
            <MiniStat label="Pending Reqs" value={`${activeProfile.pendingReqs} New`} tone="orange" />
          </div>
        </div>

        <div className="dashboard-hero-actions">
          <a href="/find-match" className="dashboard-btn-neon">⚡ Tìm Match Ngay</a>
          <a href="/profile/me" className="dashboard-btn-outline">✏️ Chỉnh sửa Profile</a>
        </div>
      </section>

      <div className="dashboard-combat-grid">
        <section className="dashboard-card dashboard-radar-card">
          <h2>Combat Profile</h2>
          <p>Chỉ số {activeLabel}</p>
          <RadarChart profile={activeProfile} game={activeGame} />
        </section>

        <div className="dashboard-stack">
          <section className="dashboard-card dashboard-panel">
            <h2>⚡ Playstyle & Traits</h2>
            <div className="dashboard-traits">
              <Trait icon={gameIcon(activeGame)} label="Main Role" value={activeProfile.role} tone={activeGame} />
              <Trait icon="🎙️" label="Comms" value={activeProfile.commStyle} />
              <Trait icon="🔥" label="Style" value={activeProfile.playStyle} />
              <Trait icon="🎯" label="Goal" value={activeProfile.goal} />
            </div>
            <div className="dashboard-pill-row">
              {activeProfile.pills.map((pill) => <span key={pill.text} className={`dashboard-pill ${pillClass(pill.cls)}`}>{pill.text}</span>)}
            </div>
          </section>

          <section className="dashboard-card dashboard-panel">
            <div className="dashboard-panel-head"><h2>📊 Recent Combat Log</h2><span>Last 3 matches</span></div>
            <div className="dashboard-match-log">
              {activeProfile.matches.map((match) => (
                <article key={match.id} className="dashboard-log-item">
                  <span className={match.result === "Win" ? "win" : "loss"} />
                  <strong>{gameIcon(activeGame)}</strong>
                  <div><h3>{match.map} · {match.score}</h3><p>{activeLabel} · {match.type} · {match.time}</p></div>
                  <aside><b className={match.result === "Win" ? "win" : "loss"}>{match.result}</b><small>{match.sub}</small></aside>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="dashboard-bottom-grid">
        <section className="dashboard-daily">
          <h2>Daily Match Drills</h2>
          {activeProfile.dailyMatches.map((match) => (
            <article key={match.id} className="dashboard-daily-card">
              <div className="dashboard-daily-player">
                <div className={activeGame}>{match.avatar}</div>
                <span><h3>{match.name}</h3><p>{activeLabel} · {match.desc}</p></span>
              </div>
              <div className="dashboard-score"><strong>{match.score}%</strong><small>match score</small></div>
              <a href="/find-match" className="dashboard-btn-neon">Gửi lời mời</a>
            </article>
          ))}
        </section>

        <aside className="dashboard-stack">
          <section className="dashboard-card dashboard-panel">
            <h3>🔗 Game Connections</h3>
            <GameConnection game="lol" activeGame={activeGame} />
            <GameConnection game="val" activeGame={activeGame} />
          </section>

          <section className="dashboard-card dashboard-panel">
            <div className="dashboard-readiness-head"><h3>🎯 Profile Readiness</h3><strong>{activeProfile.readiness}%</strong></div>
            <div className="dashboard-progress"><span className={activeGame} style={{ width: `${activeProfile.readiness}%` }} /></div>
            <div className="dashboard-check-list">
              <div>✅ <span>Verify Email FPT</span></div>
              <div>✅ <span>Connect {activeLabel} Account</span></div>
            </div>
          </section>

          <section className="dashboard-card dashboard-panel">
            <div className="dashboard-panel-head"><h3>⏳ Pending Comms</h3><span>{activeProfile.pendingReqs || dashboard.unreadMessages}</span></div>
            <a href="/conversations" className="dashboard-comm-item">
              <span>{activeProfile.pendingComms.avatar}</span>
              <div><strong>{activeProfile.pendingComms.name}</strong><small>{activeProfile.pendingComms.msg}</small></div>
              <em>5m</em>
            </a>
          </section>
        </aside>
      </div>
    </main>
  );
}

function MiniStat({ label, value, tone, gradient }: { label: string; value: string; tone?: string; gradient?: boolean }) {
  return <div className="dashboard-mini-stat"><small>{label}</small><strong className={gradient ? "text-gradient" : tone}>{value}</strong></div>;
}

function Trait({ icon, label, value, tone }: { icon: string; label: string; value: string; tone?: GameKey }) {
  return <div className={`dashboard-trait ${tone ?? ""}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>;
}

function RadarChart({ profile, game }: { profile: DashboardCombatProfile; game: GameKey }) {
  return (
    <svg viewBox="0 0 200 200" className="dashboard-radar">
      <polygon points="100,20 169.28,60 169.28,140 100,180 30.72,140 30.72,60" className="radar-grid" />
      <polygon points="100,40 152,70 152,130 100,160 48,130 48,70" className="radar-grid" />
      <polygon points="100,60 134.64,80 134.64,120 100,140 65.36,120 65.36,80" className="radar-grid" />
      <polygon points="100,80 117.32,90 117.32,110 100,120 82.68,110 82.68,90" className="radar-grid" />
      {["100,100 100,20", "100,100 169.28,60", "100,100 169.28,140", "100,100 100,180", "100,100 30.72,140", "100,100 30.72,60"].map((points) => {
        const [from, to] = points.split(" ");
        const [x1, y1] = from.split(",");
        const [x2, y2] = to.split(",");
        return <line key={points} x1={x1} y1={y1} x2={x2} y2={y2} className="radar-axis" />;
      })}
      <polygon points={profile.radar.points} className={`radar-area ${game}`} />
      {profile.radar.coords.map((point) => <circle key={`${point.cx}-${point.cy}`} cx={point.cx} cy={point.cy} r="3" className={`radar-point ${game}`} />)}
      {profile.radar.labels.map((label) => <text key={label.text} x={label.x} y={label.y} textAnchor="middle" className="radar-label">{label.text}</text>)}
    </svg>
  );
}

function GameConnection({ game, activeGame }: { game: GameKey; activeGame: GameKey }) {
  const active = game === activeGame;
  return <div className={`dashboard-connection ${game} ${active ? "active" : ""}`}><span>{gameIcon(game)}</span><strong>{game === "lol" ? "League of Legends" : "Valorant"}</strong><small>Verified</small></div>;
}
