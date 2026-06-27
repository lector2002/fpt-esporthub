"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getEvent, getFallbackPlayers } from "lib/api";
import type { TournamentEvent } from "lib/types";

export default function EventDetailPage() {
  const params = useParams();
  const [event, setEvent] = useState<TournamentEvent | null>(null);

  useEffect(() => {
    void getEvent(params.id as string).then(setEvent);
  }, [params.id]);

  const interestedPlayers = getFallbackPlayers().slice(0, 3);

  if (!event) return <div className="page-shell"><h1>Event not found</h1></div>;

  return (
    <div className="page-shell">
      <h1>{event.title}</h1>
      <section className="section">
        <div className="detail-grid">
          <div className="detail-item"><strong>Game</strong><span>{event.game}</span></div>
          <div className="detail-item"><strong>Date</strong><span>{event.date}</span></div>
          <div className="detail-item"><strong>Organizer</strong><span>{event.organizer}</span></div>
          <div className="detail-item"><strong>Deadline</strong><span>{event.deadline}</span></div>
        </div>
      </section>
      <section className="section">
        <h2>Rules</h2>
        <p>{event.rules}</p>
      </section>
      <section className="section">
        <h2>Description</h2>
        <p>{event.description}</p>
      </section>
      <section className="section">
        <h2>Interested Players ({event.interestedCount})</h2>
        <div className="interested-list">
          {interestedPlayers.map((p) => (
            <div key={p.id} className="interested-item">
              <span className="avatar-placeholder small">{p.displayName[0]}</span>
              <span>{p.displayName}</span>
              <span className="match-badge">{p.reputationBadge}</span>
            </div>
          ))}
        </div>
      </section>
      <button className="primary-action full" onClick={() => alert("Marked as interested!")}>I&apos;m Interested</button>
    </div>
  );
}
