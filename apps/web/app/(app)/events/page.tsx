"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getEvents, getFallbackEvents } from "lib/api";
import type { TournamentEvent } from "lib/types";

export default function EventsPage() {
  const [events, setEvents] = useState<TournamentEvent[]>(getFallbackEvents());

  useEffect(() => {
    void getEvents().then(setEvents);
  }, []);

  const upcoming = events.filter((event) => new Date(event.date).getTime() >= Date.now()).length;
  const totalInterest = events.reduce((sum, event) => sum + event.interestedCount, 0);

  return (
    <main className="events-shell screen-grid-bg">
      <section className="screen-hero-card events-hero">
        <div className="screen-hero-bg" />
        <div className="screen-grid-overlay" />
        <div className="screen-hero-content">
          <div>
            <div className="screen-kicker-row"><span>TOURNAMENT OPS</span><i /><small>FPT esports calendar</small></div>
            <h1>Giải đấu & sự kiện</h1>
            <p>Theo dõi tournament, scrim series và hoạt động cộng đồng đang mở đăng ký.</p>
            <div className="screen-pill-row">
              <span className="screen-pill pill-comm">🏆 Tournament</span>
              <span className="screen-pill pill-goal">🎮 Scrim</span>
              <span className="screen-pill pill-schedule">📅 Upcoming</span>
              <span className="screen-pill pill-status">👀 {totalInterest} quan tâm</span>
            </div>
          </div>
          <div className="screen-hero-actions"><button type="button" className="screen-btn-outline">📋 Tạo Event (Admin)</button></div>
        </div>
      </section>

      <section className="screen-stat-grid">
        <ScreenStat icon="🏆" label="Upcoming events" value={upcoming} tone="blue" />
        <ScreenStat icon="👀" label="Interested" value={totalInterest} tone="cyan" />
        <ScreenStat icon="🔫" label="Valorant" value={events.filter((event) => event.game === "Valorant").length} tone="purple" />
        <ScreenStat icon="✅" label="Open calendar" value={events.length} tone="green" />
      </section>

      <div className="screen-main-grid">
        <section className="screen-main-col">
          <div className="screen-section-head"><h2>Sự kiện sắp diễn ra</h2></div>
          {events.map((event) => <EventCard key={event.id} event={event} />)}
          {events.length === 0 && <div className="screen-empty-box">Chưa có event.</div>}
        </section>

        <aside className="screen-side-col">
          <section className="screen-panel screen-gradient-panel">
            <h3>📅 Lọc Events</h3>
            <FilterBlock title="Game"><button className="screen-pill pill-comm">Tất cả</button><button className="screen-pill pill-muted">Valorant</button><button className="screen-pill pill-muted">LoL</button></FilterBlock>
            <FilterBlock title="Trạng thái"><button className="screen-pill pill-status">Đang đăng ký</button><button className="screen-pill pill-muted">Sắp diễn ra</button></FilterBlock>
          </section>
        </aside>
      </div>
    </main>
  );
}

function EventCard({ event }: { event: TournamentEvent }) {
  return (
    <article className="events-card">
      <div className="events-avatar">🏆</div>
      <div className="events-card-body">
        <div className="events-title-row"><h3>{event.title}</h3><span>Open</span></div>
        <p>{event.game} · 📅 {new Date(event.date).toLocaleDateString("vi-VN")} · 👀 {event.interestedCount} quan tâm</p>
        <small>{event.description}</small>
      </div>
      <div className="events-actions"><button type="button" className="screen-btn-primary">Đăng ký ngay</button><a href={`/events/${event.id}`} className="screen-btn-outline">Chi tiết</a></div>
    </article>
  );
}

function FilterBlock({ title, children }: { title: string; children: ReactNode }) {
  return <div className="screen-filter-block"><p>{title}</p><div className="screen-pill-row">{children}</div></div>;
}

function ScreenStat({ icon, label, value, tone }: { icon: string; label: string; value: string | number; tone: string }) {
  return <div className="screen-stat-card"><div className={tone}>{icon}</div><span><small>{label}</small><strong>{value}</strong></span></div>;
}
