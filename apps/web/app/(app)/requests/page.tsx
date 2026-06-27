"use client";

import { useEffect, useState } from "react";
import { getFallbackProfile, getFallbackRequests, getRequests, updateRequest } from "lib/api";
import type { MatchRequest } from "lib/types";

type RequestFilter = "all" | "pending" | "accepted" | "declined" | "sent";

export default function RequestsPage() {
  const currentUser = getFallbackProfile();
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [requests, setRequests] = useState<MatchRequest[]>(getFallbackRequests());

  useEffect(() => {
    void getRequests().then(setRequests);
  }, []);

  const handleAction = (id: string, status: "accepted" | "declined" | "cancelled") => {
    setRequests((prev) => prev.map((request) => (request.id === id ? { ...request, status } : request)));
    const action = status === "accepted" ? "accept" : status === "declined" ? "decline" : "cancel";
    void updateRequest(id, action).catch(() => undefined);
  };

  const filtered = requests.filter((request) => {
    if (filter === "all") return true;
    if (filter === "sent") return request.fromUserId === currentUser.userId || request.fromUserId === currentUser.id;
    return request.status === filter;
  });
  const pending = requests.filter((request) => request.status === "pending");
  const sent = requests.filter((request) => request.fromUserId === currentUser.userId || request.fromUserId === currentUser.id);

  return (
    <main className="req-shell screen-grid-bg">
      <section className="screen-hero-card req-hero">
        <div className="screen-hero-bg" />
        <div className="screen-grid-overlay" />
        <div className="screen-hero-content">
          <div>
            <div className="screen-kicker-row"><span>REQUEST INBOX</span><i /><small>Squad recruitment queue</small></div>
            <h1>Lời mời & phản hồi</h1>
            <p>Quản lý request tìm đồng đội, apply team và lời mời đang chờ xử lý.</p>
            <div className="screen-pill-row">
              <span className="screen-pill pill-comm">📨 {pending.length} pending</span>
              <span className="screen-pill pill-goal">📤 {sent.length} sent</span>
              <span className="screen-pill pill-status">✅ {requests.filter((request) => request.status === "accepted").length} accepted</span>
            </div>
          </div>
          <div className="screen-hero-actions"><a href="/find-match" className="screen-btn-primary">🔍 Tìm thêm match</a></div>
        </div>
      </section>

      <section className="screen-stat-grid">
        <ScreenStat icon="⏳" label="Pending" value={pending.length} tone="orange" />
        <ScreenStat icon="✅" label="Accepted" value={requests.filter((request) => request.status === "accepted").length} tone="green" />
        <ScreenStat icon="📤" label="Sent" value={sent.length} tone="blue" />
        <ScreenStat icon="📥" label="Total" value={requests.length} tone="cyan" />
      </section>

      <div className="screen-main-grid">
        <section className="screen-main-col">
          <div className="screen-section-head">
            <h2>Request Queue</h2>
            <div className="req-tabs" role="group" aria-label="Request filters">
              {(["all", "pending", "accepted", "declined", "sent"] as RequestFilter[]).map((item) => <button key={item} type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}
            </div>
          </div>
          {filtered.map((request) => <RequestCard key={request.id} request={request} currentUserId={currentUser.userId} fallbackUserId={currentUser.id} onAction={handleAction} />)}
          {filtered.length === 0 && <div className="screen-empty-box">Không có request trong bộ lọc này.</div>}
        </section>

        <aside className="screen-side-col">
          <section className="screen-panel">
            <h3>⚡ Request Tips</h3>
            <div className="screen-tip-list">
              <div className="screen-tip done">✅ <span>Phản hồi nhanh giúp tăng trust.</span></div>
              <div className="screen-tip pending">⏳ <span>Accepted request sẽ mở chat tự động.</span></div>
              <div className="screen-tip todo">⚪ <span>Report/block nếu gặp hành vi toxic.</span></div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function RequestCard({ request, currentUserId, fallbackUserId, onAction }: { request: MatchRequest; currentUserId: string; fallbackUserId: string; onAction: (id: string, status: "accepted" | "declined" | "cancelled") => void }) {
  const sentByMe = request.fromUserId === currentUserId || request.fromUserId === fallbackUserId;
  const displayName = sentByMe ? request.toName : request.fromName;
  return (
    <article className={`req-card ${request.status}`}>
      <div className="req-avatar">{displayName[0] ?? "?"}</div>
      <div className="req-body">
        <div className="req-title-row"><h3>{displayName}</h3><span>{request.status}</span></div>
        <p>{sentByMe ? "Bạn đã gửi lời mời" : "Lời mời gửi đến bạn"} · {request.type.replaceAll("_", " ")}</p>
        <small>“{request.message}”</small>
        <em>Sent {new Date(request.createdAt).toLocaleDateString("vi-VN")}</em>
      </div>
      <div className="req-actions">
        {request.status === "pending" && !sentByMe && <><button type="button" className="screen-btn-primary" onClick={() => onAction(request.id, "accepted")}>Chấp nhận</button><button type="button" className="screen-btn-outline" onClick={() => onAction(request.id, "declined")}>Từ chối</button></>}
        {request.status === "pending" && sentByMe && <button type="button" className="screen-btn-outline" onClick={() => onAction(request.id, "cancelled")}>Hủy</button>}
        {request.status === "accepted" && <a href="/conversations" className="screen-btn-primary">Mở chat</a>}
      </div>
    </article>
  );
}

function ScreenStat({ icon, label, value, tone }: { icon: string; label: string; value: string | number; tone: string }) {
  return <div className="screen-stat-card"><div className={tone}>{icon}</div><span><small>{label}</small><strong>{value}</strong></span></div>;
}
