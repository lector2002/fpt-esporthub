"use client";

import { useEffect, useState } from "react";
import { getFallbackPlayers, getFallbackProfile, getFallbackRequests, getFallbackTeams, getMyProfile, getRequests, getTeams } from "lib/api";
import type { MatchRequest, PlayerProfile, TeamProfile } from "lib/types";

function gameLabel(gameId: string) {
  return gameId === "valorant" ? "Valorant" : "League of Legends";
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<PlayerProfile>(getFallbackProfile());
  const [players, setPlayers] = useState<PlayerProfile[]>(getFallbackPlayers().slice(0, 2));
  const [teams, setTeams] = useState<TeamProfile[]>(getFallbackTeams().slice(0, 2));
  const [requests, setRequests] = useState<MatchRequest[]>(getFallbackRequests());

  useEffect(() => {
    async function loadDashboard() {
      const [nextProfile, nextTeams, nextRequests] = await Promise.all([getMyProfile(), getTeams(), getRequests()]);
      setProfile(nextProfile);
      setTeams(nextTeams.slice(0, 2));
      setRequests(nextRequests);
      setPlayers(getFallbackPlayers().filter((player) => player.gameId === nextProfile.gameId).slice(0, 2));
    }
    void loadDashboard();
  }, []);

  const pending = requests.filter((request) => request.status === "pending");
  const unreadMessages = 2;
  const readiness = profile.riotId && profile.commStyleIds.length >= 2 ? 90 : 78;
  const drillItems = [
    ...players.map((player, index) => ({
      id: player.id,
      title: player.displayName,
      desc: `${gameLabel(player.gameId)} · ${player.rankLabel} · ${player.roleLabel}`,
      score: 88 - index * 7,
      cta: "Gửi lời mời",
      href: "/find-match",
    })),
    ...teams.map((team, index) => ({
      id: team.id,
      title: team.name,
      desc: `${gameLabel(team.gameId)} · ${team.rankRange} · Cần ${team.neededRoles.join(", ") || "Flexible"}`,
      score: 84 - index * 6,
      cta: "Xem team",
      href: `/teams/${team.id}`,
    })),
  ];
  const tips = [
    { label: "Đã verify Email FPT (+10% score)", state: "done" },
    { label: profile.verificationStatus === "verified" ? "Đã verify Riot ID (+15% score)" : "Verify Riot ID để tăng trust", state: profile.verificationStatus === "verified" ? "done" : "pending" },
    { label: profile.schedule.includes(",") ? "Lịch chơi đủ chi tiết" : "Cập nhật thêm khung giờ chơi", state: profile.schedule.includes(",") ? "done" : "todo" },
  ];

  return (
    <main className="dash-shell screen-grid-bg">
      <section className="screen-hero-card dash-hero">
        <div className="screen-hero-bg" />
        <div className="screen-grid-overlay" />
        <div className="screen-hero-content">
          <div>
            <div className="screen-kicker-row"><span>COMMAND CENTER</span><i /><small>Daily battle brief</small></div>
            <h1>Xin chào, {profile.displayName}</h1>
            <p>Sẵn sàng tìm squad hôm nay? Đây là tóm tắt match, request và profile readiness của bạn.</p>
            <div className="screen-pill-row">
              <span className="screen-pill pill-comm">🔫 {gameLabel(profile.gameId)}</span>
              <span className="screen-pill pill-goal">🏆 {profile.rankLabel}</span>
              <span className="screen-pill pill-schedule">⚔️ {profile.roleLabel}</span>
              <span className="screen-pill pill-status">🛡️ {profile.reputationBadge}</span>
            </div>
          </div>
          <div className="screen-hero-actions">
            <a href="/find-match" className="screen-btn-primary">🔍 Tìm đồng đội</a>
            <a href="/profile/me" className="screen-btn-outline">✏️ Cập nhật hồ sơ</a>
          </div>
        </div>
      </section>

      <section className="screen-stat-grid">
        <ScreenStat icon="🎯" label="Live leads" value={drillItems.length} tone="cyan" />
        <ScreenStat icon="📨" label="Pending requests" value={pending.length} tone="orange" />
        <ScreenStat icon="💬" label="Unread messages" value={unreadMessages} tone="blue" />
        <ScreenStat icon="⚡" label="Profile ready" value={`${readiness}%`} tone="purple" />
      </section>

      <div className="screen-main-grid">
        <section className="screen-main-col">
          <div className="screen-section-head"><h2>Daily Match Drills & Actions</h2></div>
          {drillItems.map((item) => (
            <article key={item.id} className="dash-action-card">
              <div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
              <strong>{item.score}%</strong>
              <a href={item.href} className="screen-btn-primary">{item.cta}</a>
            </article>
          ))}
        </section>

        <aside className="screen-side-col">
          <section className="screen-panel">
            <h3>⚡ Tối ưu Profile</h3>
            <div className="screen-tip-list">
              {tips.map((tip) => <div key={tip.label} className={`screen-tip ${tip.state}`}>{tip.state === "done" ? "✅" : tip.state === "pending" ? "⏳" : "⚪"}<span>{tip.label}</span></div>)}
            </div>
          </section>

          <section className="screen-panel">
            <div className="screen-panel-head"><h3>⏳ Pending Comms</h3><span>{pending.length}</span></div>
            <div className="screen-mini-list">
              {pending.slice(0, 3).map((request) => (
                <a key={request.id} href="/requests" className="screen-mini-item">
                  <span>⚡</span>
                  <div><strong>{request.fromUserId === profile.userId ? request.toName : request.fromName}</strong><small>{request.message}</small></div>
                  <em>{new Date(request.createdAt).toLocaleDateString("vi-VN")}</em>
                </a>
              ))}
              {pending.length === 0 && <p className="screen-empty-copy">Không có request đang chờ.</p>}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function ScreenStat({ icon, label, value, tone }: { icon: string; label: string; value: string | number; tone: string }) {
  return <div className="screen-stat-card"><div className={tone}>{icon}</div><span><small>{label}</small><strong>{value}</strong></span></div>;
}
