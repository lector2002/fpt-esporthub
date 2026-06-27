"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getFallbackTeams, getTeams } from "lib/api";
import type { TeamProfile } from "lib/types";

function gameLabel(gameId: string) {
  return gameId === "valorant" ? "Valorant" : "League of Legends";
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamProfile[]>(getFallbackTeams());

  useEffect(() => {
    void getTeams().then(setTeams);
  }, []);

  const recruiting = teams.filter((team) => team.recruitmentOpen);
  const neededRoles = Array.from(new Set(teams.flatMap((team) => team.neededRoles)));

  return (
    <main className="teams-shell screen-grid-bg">
      <section className="screen-hero-card teams-hero">
        <div className="screen-hero-bg" />
        <div className="screen-grid-overlay" />
        <div className="screen-hero-content">
          <div>
            <div className="screen-kicker-row"><span>SQUAD RECRUITMENT</span><i /><small>{recruiting.length} team đang mở tuyển</small></div>
            <h1>Tìm squad phù hợp</h1>
            <p>Khám phá team đang tuyển theo game, rank range, role còn thiếu và lịch luyện tập.</p>
            <div className="screen-pill-row">
              <span className="screen-pill pill-comm">🔫 Valorant</span>
              <span className="screen-pill pill-goal">⚔️ League of Legends</span>
              <span className="screen-pill pill-schedule">👥 Squad 5 người</span>
              <span className="screen-pill pill-status">🟢 Recruiting</span>
            </div>
          </div>
          <div className="screen-hero-actions">
            <a href="/teams/new" className="screen-btn-primary">➕ Tạo squad mới</a>
            <a href="/find-match" className="screen-btn-outline">🔍 Tìm players</a>
          </div>
        </div>
      </section>

      <section className="screen-stat-grid">
        <ScreenStat icon="👥" label="Teams open" value={recruiting.length} tone="purple" />
        <ScreenStat icon="⚔️" label="Roles needed" value={neededRoles.length} tone="cyan" />
        <ScreenStat icon="🏆" label="Valorant squads" value={teams.filter((team) => team.gameId === "valorant").length} tone="blue" />
        <ScreenStat icon="✅" label="Active squads" value={teams.length} tone="green" />
      </section>

      <div className="screen-main-grid">
        <section className="screen-main-col">
          <div className="screen-section-head"><h2>Teams Đang Tuyển</h2></div>
          {teams.map((team) => <TeamCard key={team.id} team={team} />)}
          {teams.length === 0 && <div className="screen-empty-box">Chưa có team. Hãy tạo squad đầu tiên.</div>}
        </section>

        <aside className="screen-side-col">
          <section className="screen-panel screen-gradient-panel">
            <h3>⚙️ Bộ lọc Team</h3>
            <FilterBlock title="Game"><button className="screen-pill pill-comm">🔫 Valorant</button><button className="screen-pill pill-muted">⚔️ LoL</button></FilterBlock>
            <FilterBlock title="Role cần tìm"><button className="screen-pill pill-muted">Duelist</button><button className="screen-pill pill-comm">Controller</button><button className="screen-pill pill-muted">Sentinel</button></FilterBlock>
            <FilterBlock title="Rank Range"><select className="screen-select" defaultValue="Any Rank"><option>Any Rank</option><option>Diamond - Immortal</option><option>Gold - Diamond</option></select></FilterBlock>
          </section>

          <section className="screen-panel">
            <h3>⚡ Recruitment Tips</h3>
            <div className="screen-tip-list">
              <div className="screen-tip done">✅ <span>Team có role rõ ràng sẽ nhận request tốt hơn.</span></div>
              <div className="screen-tip pending">⏳ <span>Thêm lịch scrim để tăng match score.</span></div>
              <div className="screen-tip todo">⚪ <span>Captain nên verify Riot ID trước beta.</span></div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function TeamCard({ team }: { team: TeamProfile }) {
  return (
    <article className="teams-card">
      <div className="teams-avatar">{team.tag}</div>
      <div className="teams-card-body">
        <div className="teams-title-row"><h3>{team.name}</h3>{team.recruitmentOpen && <span>Recruiting</span>}</div>
        <p>{gameLabel(team.gameId)} · {team.rankRange} · {team.memberCount}/5 Members</p>
        <small>{team.description}</small>
        <div className="screen-pill-row">{team.neededRoles.map((role) => <span key={role} className="screen-pill pill-goal">{role}</span>)}</div>
      </div>
      <a href={`/teams/${team.id}`} className="screen-btn-outline">Xem chi tiết</a>
    </article>
  );
}

function FilterBlock({ title, children }: { title: string; children: ReactNode }) {
  return <div className="screen-filter-block"><p>{title}</p><div className="screen-pill-row">{children}</div></div>;
}

function ScreenStat({ icon, label, value, tone }: { icon: string; label: string; value: string | number; tone: string }) {
  return <div className="screen-stat-card"><div className={tone}>{icon}</div><span><small>{label}</small><strong>{value}</strong></span></div>;
}
