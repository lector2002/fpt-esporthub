"use client";

import { useEffect, useState } from "react";
import { createMatchRequest, getFindMatchView } from "lib/api";
import type { FindMatchView, MatchResult } from "lib/types";

type MatchMode = "players" | "teams" | "all";

const emptyView: FindMatchView = {
  profile: { game: "Valorant", rank: "Unranked", role: "Flexible", schedule: "Flexible", updatedLabel: "Đang tải" },
  stats: { totalSuggestions: 0, averageScore: 0, pendingSent: 0, accepted: 0 },
  matches: [],
  pendingRequests: [],
  tips: [],
};

const reasonIcon = (reason: string) => {
  const normalized = reason.toLowerCase();
  if (normalized.includes("rank")) return "📈";
  if (normalized.includes("schedule") || normalized.includes("lịch")) return "🕒";
  if (normalized.includes("communication") || normalized.includes("giao tiếp") || normalized.includes("shot")) return "🎙️";
  if (normalized.includes("goal") || normalized.includes("mục tiêu")) return "🏆";
  if (normalized.includes("role")) return "⚔️";
  return "✨";
};

export default function FindMatchPage() {
  const [mode, setMode] = useState<MatchMode>("all");
  const [view, setView] = useState<FindMatchView>(emptyView);
  const [requestTarget, setRequestTarget] = useState<MatchResult | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestStatus, setRequestStatus] = useState("");

  useEffect(() => {
    const apiMode = mode === "teams" ? "teams" : "players";
    void getFindMatchView(apiMode).then(setView);
  }, [mode]);

  const filteredMatches = mode === "all" ? view.matches : view.matches.filter((match) => match.type === mode.slice(0, -1));

  const openRequestModal = (match: MatchResult) => {
    setRequestTarget(match);
    setRequestMessage(`Ê ${match.name}, mình thấy profile khá hợp. Ghép đội luyện tập thử không?`);
    setRequestStatus("");
  };

  const sendRequest = async () => {
    if (!requestTarget) return;
    setRequestStatus("Đang gửi...");
    try {
      await createMatchRequest({
        targetType: requestTarget.type,
        targetId: requestTarget.id,
        message: requestMessage,
      });
      setRequestStatus("Đã gửi lời mời.");
      setRequestTarget(null);
      const apiMode = mode === "teams" ? "teams" : "players";
      setView(await getFindMatchView(apiMode));
    } catch {
      setRequestStatus("Chưa gửi được. Có thể lời mời đã tồn tại hoặc API/DB chưa sẵn sàng.");
    }
  };

  return (
    <main className="fm-shell">
      <section className="fm-hero-card">
        <div className="fm-hero-bg" />
        <div className="fm-grid-overlay" />
        <div className="fm-hero-content">
          <div className="fm-hero-copy">
            <div className="fm-kicker-row">
              <span>SMART MATCHMAKING</span>
              <i />
              <small>{view.profile.updatedLabel}</small>
            </div>
            <h1>Gợi ý đồng đội cho bạn</h1>
            <p>Dựa trên Rank ({view.profile.rank}), Role ({view.profile.role}), Lịch chơi và Mục tiêu thi đấu của bạn.</p>
            <div className="fm-pill-row">
              <span className="fm-pill fm-pill-goal">🔫 {view.profile.game}</span>
              <span className="fm-pill fm-pill-comm">🏆 {view.profile.rank}</span>
              <span className="fm-pill fm-pill-schedule">⚔️ {view.profile.role}</span>
              <span className="fm-pill fm-pill-schedule">🕒 {view.profile.schedule}</span>
            </div>
          </div>
          <div className="fm-hero-actions">
            <button type="button" className="fm-btn-neon">⚙️ Tùy chỉnh bộ lọc</button>
            <button type="button" className="fm-btn-outline" onClick={() => void getFindMatchView(mode === "teams" ? "teams" : "players").then(setView)}>🔄 Làm mới gợi ý</button>
          </div>
        </div>
      </section>

      <section className="fm-stat-grid">
        <MatchStat icon="🎯" label="Gợi ý hôm nay" value={`${view.stats.totalSuggestions} ${mode === "teams" ? "Teams" : "Players"}`} tone="cyan" />
        <MatchStat icon="⚡" label="Match score TB" value={`${view.stats.averageScore}%`} tone="purple" />
        <MatchStat icon="📤" label="Lời mời đã gửi" value={`${view.stats.pendingSent} Đang chờ`} tone="blue" />
        <MatchStat icon="✅" label="Đã chấp nhận" value={`${view.stats.accepted} Squad`} tone="green" />
      </section>

      <div className="fm-content-grid">
        <section className="fm-match-column">
          <div className="fm-section-head">
            <h2>Đề xuất đồng đội</h2>
            <div className="fm-mode-tabs" role="group" aria-label="Bộ lọc loại match">
              <button type="button" className={mode === "all" ? "active" : ""} onClick={() => setMode("all")}>Tất cả</button>
              <button type="button" className={mode === "players" ? "active" : ""} onClick={() => setMode("players")}>Players</button>
              <button type="button" className={mode === "teams" ? "active" : ""} onClick={() => setMode("teams")}>Teams</button>
            </div>
          </div>

          <div className="fm-match-list">
            {filteredMatches.map((match) => <MatchCard key={`${match.type}-${match.id}`} match={match} onInvite={() => openRequestModal(match)} />)}
          </div>

          {filteredMatches.length === 0 && (
            <div className="fm-empty-state">Chưa có gợi ý phù hợp. Thử đổi bộ lọc hoặc cập nhật hồ sơ.</div>
          )}
        </section>

        <aside className="fm-sidebar">
          <section className="fm-panel fm-gradient-panel">
            <h3>⚙️ Bộ lọc nhanh</h3>
            <div className="fm-filter-block">
              <p>Game</p>
              <div className="fm-pill-row">
                <button type="button" className="fm-pill fm-pill-selected">🔫 Valorant</button>
                <button type="button" className="fm-pill fm-pill-muted">⚔️ LoL</button>
              </div>
            </div>
            <div className="fm-filter-block">
              <p>Role cần tìm</p>
              <div className="fm-pill-row">
                <button type="button" className="fm-pill fm-pill-muted">Duelist</button>
                <button type="button" className="fm-pill fm-pill-selected">Initiator</button>
                <button type="button" className="fm-pill fm-pill-selected">Controller</button>
                <button type="button" className="fm-pill fm-pill-muted">Sentinel</button>
              </div>
            </div>
            <div className="fm-filter-block">
              <p>Khoảng Rank</p>
              <div className="fm-rank-selects">
                <select defaultValue="Diamond" aria-label="Rank thấp nhất"><option>Platinum</option><option>Diamond</option><option>Immortal</option></select>
                <span>→</span>
                <select defaultValue="Immortal" aria-label="Rank cao nhất"><option>Platinum</option><option>Diamond</option><option>Immortal</option></select>
              </div>
            </div>
          </section>

          <section className="fm-panel">
            <h3>⚡ Tối ưu Matchmaking</h3>
            <div className="fm-tip-list">
              {view.tips.map((tip) => <div key={tip.label} className={`fm-tip ${tip.state}`}>{tip.state === "done" ? "✅" : tip.state === "pending" ? "⏳" : "⚪"}<span>{tip.label}</span></div>)}
            </div>
          </section>

          <section className="fm-panel">
            <div className="fm-panel-head">
              <h3>⏳ Đang chờ phản hồi</h3>
              <span>{view.pendingRequests.length}</span>
            </div>
            <div className="fm-pending-list">
              {view.pendingRequests.map((request) => (
                <div key={request.id} className="fm-pending-item">
                  <span className="fm-pending-avatar">{request.avatarEmoji}</span>
                  <div>
                    <strong>{request.name}</strong>
                    <small>{request.sentAtLabel}</small>
                  </div>
                  <em>{request.statusLabel}</em>
                </div>
              ))}
              {view.pendingRequests.length === 0 && <p className="fm-sidebar-empty">Chưa có lời mời đang chờ.</p>}
            </div>
            <a href="/requests" className="fm-view-all">Xem tất cả lời mời →</a>
          </section>
        </aside>
      </div>

      {requestTarget && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="request-modal glass-panel">
            <h2>Mời {requestTarget.name}</h2>
            <textarea value={requestMessage} onChange={(event) => setRequestMessage(event.target.value)} rows={4} placeholder="Viết lời mời ngắn gọn..." />
            <div className="modal-actions">
              <button type="button" className="secondary-action" onClick={() => { setRequestTarget(null); setRequestStatus(""); }}>Hủy</button>
              <button type="button" className="primary-action" onClick={sendRequest}>Gửi lời mời</button>
            </div>
            {requestStatus && <p className="hint">{requestStatus}</p>}
          </div>
        </div>
      )}
    </main>
  );
}

function MatchStat({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: string }) {
  return <div className="fm-stat-card"><div className={tone}>{icon}</div><span><small>{label}</small><strong>{value}</strong></span></div>;
}

function MatchCard({ match, onInvite }: { match: MatchResult; onInvite: () => void }) {
  const isCaution = match.reputationBadge === "Caution" || Boolean(match.cautionMessage);
  return (
    <article className={`fm-match-card ${isCaution ? "caution" : ""}`}>
      <div className="fm-match-player">
        <div className="fm-match-avatar">{match.avatarEmoji ?? match.name[0]}</div>
        <div>
          <div className="fm-name-row">
            <h3>{match.name}</h3>
            {match.verificationStatus === "Verified" ? <span title="Verified">✅</span> : match.reputationBadge === "Trusted" ? <span title="Trusted">🛡️</span> : isCaution ? <span title="Caution">⚠️</span> : null}
          </div>
          <p>{match.rank} · {match.role}</p>
          <div className="fm-score-row">
            <strong className={match.score >= 70 ? "fm-score-gradient" : ""}>{match.score}%</strong>
            <small>match<br />score</small>
          </div>
        </div>
      </div>

      <div className="fm-match-reasons">
        <p>Lý do phù hợp</p>
        <div className="fm-pill-row">
          {match.reasons.map((reason) => <span key={reason} className="fm-pill fm-pill-goal">{reasonIcon(reason)} {reason}</span>)}
        </div>
        {match.cautionMessage ? <div className="fm-caution-box">⚠️ {match.cautionMessage}</div> : <small>“{match.bio ?? "Sẵn sàng luyện tập và ghép squad nghiêm túc."}”</small>}
      </div>

      <div className="fm-card-actions">
        <button type="button" className="fm-btn-neon" onClick={onInvite}>Gửi lời mời</button>
        <a className="fm-btn-outline" href={match.type === "team" ? `/teams/${match.id}` : "/profile/me"}>Profile</a>
      </div>
    </article>
  );
}
