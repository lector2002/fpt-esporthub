"use client";

import { useEffect, useState } from "react";
import { getMyProfileView, verifyRiotId } from "lib/api";
import { useLanguage } from "lib/i18n";
import type { ProfileView } from "lib/types";

const goalIcons: Record<string, string> = {
  rank_climb: "📈",
  scrim_practice: "🤝",
  join_tournaments: "🏆",
  find_team: "👥",
  casual_play: "🎮",
  find_members: "➕",
};

const goalLabels: Record<string, string> = {
  rank_climb: "Leo rank",
  scrim_practice: "Scrim/Luyện tập",
  join_tournaments: "Thi đấu giải",
  find_team: "Tìm team",
  casual_play: "Chơi vui",
  find_members: "Tuyển thành viên",
};

const commLabels: Record<string, string> = {
  try_hard: "Try-hard",
  shotcaller: "Shotcaller (IGL)",
  chill: "Chill",
  quiet_focus: "Tập trung",
  beginner_friendly: "Thân thiện newbie",
};

export default function ProfilePage() {
  const { language, setLanguage } = useLanguage();
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [connectionMessage, setConnectionMessage] = useState("");

  useEffect(() => {
    void getMyProfileView().then(setProfile);
  }, []);

  if (!profile) {
    return <div className="profile-ui-shell"><div className="profile-ui-loading">Đang tải hồ sơ...</div></div>;
  }

  const riotPending = profile.verificationLabel !== "Verified";

  const handleVerifyRiot = async () => {
    setConnectionMessage("Đang gọi Riot Account API...");
    try {
      await verifyRiotId();
      const nextProfile = await getMyProfileView();
      setProfile(nextProfile);
      setConnectionMessage("Đã xác minh Riot ID qua Riot Account API.");
    } catch {
      setConnectionMessage("Chưa xác minh được. Cần RIOT_API_KEY hợp lệ hoặc Riot ID đúng định dạng GameName#TagLine.");
    }
  };

  return (
    <div className="profile-ui-shell">
      <div className="profile-ui-topbar-spacer" />
      <main className="profile-ui-main">
        <section className="profile-hero-card">
          <div className={`profile-hero-bg profile-hero-${profile.gameTheme}`} />
          <div className="profile-grid-overlay" />
          <div className="profile-hero-content">
            <div className="profile-avatar-zone">
              <div className="profile-big-avatar">{profile.avatarEmoji}</div>
              <div className="profile-looking-pill">
                <span />
                {profile.lookingForTeam ? "Đang tìm team" : "Không tìm team"}
              </div>
            </div>

            <div className="profile-identity">
              <div className="profile-title-row">
                <h1>{profile.displayName}</h1>
                <div className="profile-badge-row">
                  <span className="profile-badge verified">✅ {profile.verificationLabel}</span>
                  <span className="profile-badge trusted">🛡️ {profile.reputationLabel}</span>
                </div>
              </div>
              <p className="profile-bio">&quot;{profile.bio}&quot;</p>
              <div className="profile-meta-pills">
                <span><b>🔫</b>{profile.gameLabel}</span>
                <span><b>🏆</b>{profile.rankLabel}</span>
                <span><b>⚔️</b>{profile.roleLabel}</span>
                <span className="mono"><b>🔗</b>{profile.riotId ?? "Riot ID chưa đặt"}</span>
              </div>
            </div>

            <div className="profile-actions">
              <button type="button" className="profile-btn-neon">✏️ Chỉnh sửa hồ sơ</button>
              <div className="profile-lang-toggle" role="group" aria-label="Ngôn ngữ giao diện">
                <button type="button" className={language === "vi" ? "active" : ""} onClick={() => setLanguage("vi")}>VI</button>
                <button type="button" className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>EN</button>
              </div>
            </div>
          </div>
        </section>

        <section className="profile-stat-grid">
          <ProfileStat icon="🔫" label="Game" value={profile.gameLabel} tone="red" />
          <ProfileStat icon="🏆" label="Rank" value={profile.rankLabel} tone="yellow" />
          <ProfileStat icon="🎯" label="Main Role" value={profile.roleLabel} tone="cyan" />
          <ProfileStat icon="🕒" label="Schedule" value={profile.availability[0]?.label ?? "Flexible"} tone="purple" />
        </section>

        <div className="profile-content-grid">
          <div className="profile-left-col">
            <section className="profile-panel gradient-border-card">
              <h2>⚡ Playstyle & Mục tiêu</h2>
              <p>Định hình phong cách chơi và mong muốn hiện tại</p>
              <div className="profile-section-block">
                <h3>Mục tiêu</h3>
                <div className="profile-pill-list">
                  {profile.goals.map((goal) => <span key={goal} className="profile-pill goal">{goalIcons[goal] ?? "🎯"} {goalLabels[goal] ?? goal}</span>)}
                </div>
              </div>
              <div className="profile-section-block">
                <h3>Giao tiếp</h3>
                <div className="profile-pill-list">
                  {profile.communicationStyles.map((style) => <span key={style} className="profile-pill comm">🔥 {commLabels[style] ?? style}</span>)}
                </div>
              </div>
            </section>

            <section className="profile-panel">
              <h2>📅 Lịch sẵn sàng (Availability)</h2>
              <div className="profile-availability-list">
                {profile.availability.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="profile-availability-item">
                    <div className={`profile-time-icon ${index === 0 ? "cyan" : "purple"}`}>{index === 0 ? "🕒" : "🌴"}</div>
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </div>
                    <span>{item.tag}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="profile-panel">
              <div className="profile-readiness-head">
                <h2>🎯 Profile Readiness</h2>
                <strong>{profile.readiness.percent}%</strong>
              </div>
              <div className="profile-progress"><span style={{ width: `${profile.readiness.percent}%` }} /></div>
              <div className="profile-check-grid">
                {profile.readiness.checks.map((check) => (
                  <div key={check.label} className={check.complete ? "done" : "todo"}>{check.complete ? "✅" : check.label.includes("Verification") ? "❌" : "⏳"} <span>{check.label}</span></div>
                ))}
              </div>
            </section>
          </div>

          <div className="profile-right-col">
            <section className="profile-panel compact">
              <h2>🛡️ Trust & Safety</h2>
              <TrustRow label="Email FPT" icon="📧" value={profile.emailVerified ? "Verified" : "Unverified"} tone="cyan" />
              <TrustRow label="Riot ID" icon="🔗" value={riotPending ? "Pending" : "Verified"} tone={riotPending ? "yellow" : "cyan"} />
              <TrustRow label="Reputation" icon="🛡️" value={profile.reputationLabel} tone="purple" />
              <p className="profile-safety-note">Reputation dựa trên hoạt động và đánh giá. Số điểm chi tiết được ẩn để bảo vệ quyền riêng tư.</p>
            </section>

            <section className="profile-panel compact">
              <h2>🔗 Kết nối game</h2>
              <p className="profile-connect-intro">Liên kết Riot account để xác minh rank và đồng bộ dữ liệu LoL/Valorant.</p>
              <div className="profile-game-connect-list">
                {profile.gameConnections.map((connection) => (
                  <div key={connection.gameId} className="profile-game-connect-card">
                    <div className="profile-game-connect-head">
                      <span>{connection.icon}</span>
                      <div>
                        <strong>{connection.game}</strong>
                        <small>{connection.description}</small>
                      </div>
                    </div>
                    <div className="profile-game-connect-meta">
                      <span className={`status ${connection.status}`}>{connection.statusLabel}</span>
                      <span className={`complexity ${connection.complexity.toLowerCase()}`}>{connection.complexity}</span>
                    </div>
                    <p>{connection.requirement}</p>
                    <button type="button" className="profile-connect-action" disabled={connection.status === "requires_rso"} onClick={connection.gameId === "league_of_legends" ? handleVerifyRiot : undefined}>
                      {connection.status === "connected" ? "Đồng bộ lại" : connection.status === "requires_rso" ? "Cần Riot RSO" : "Kết nối"}
                    </button>
                  </div>
                ))}
              </div>
              {connectionMessage && <p className="profile-connect-message">{connectionMessage}</p>}
            </section>

            <section className="profile-panel compact">
              <h2>👥 Team Affiliation</h2>
              {profile.teams.map((team) => (
                <a key={team.id} href={`/teams/${team.id}`} className="profile-team-card">
                  <div className="profile-team-head">
                    <span>{team.tag}</span>
                    <div>
                      <strong>{team.name}</strong>
                      <small>{team.gameLabel} · {team.role}</small>
                    </div>
                  </div>
                  <div className="profile-team-tags">
                    <span>{team.memberCount}/5 Members</span>
                    {team.neededRoles[0] && <span>Need: {team.neededRoles[0]}</span>}
                  </div>
                </a>
              ))}
              <a href="/teams/new" className="profile-create-team">➕ Tạo squad mới</a>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function ProfileStat({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: string }) {
  return <div className="profile-stat"><div className={tone}>{icon}</div><span><small>{label}</small><strong>{value}</strong></span></div>;
}

function TrustRow({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: string }) {
  return <div className="profile-trust-row"><span>{icon} {label}</span><strong className={tone}>{value}</strong></div>;
}
