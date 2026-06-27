"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getTeam } from "lib/api";
import type { TeamProfile } from "lib/types";

export default function TeamDetailPage() {
  const params = useParams();
  const [team, setTeam] = useState<TeamProfile | null>(null);

  useEffect(() => {
    void getTeam(params.id as string).then(setTeam);
  }, [params.id]);

  if (!team) return <div className="page-shell"><h1>Team not found</h1></div>;

  return (
    <div className="page-shell">
      <h1>{team.name} <span className="team-tag">{team.tag}</span></h1>
      <section className="section">
        <div className="profile-hero">
          <div className="profile-avatar">{team.name[0]}</div>
          <div className="profile-info">
            <p>{team.description}</p>
            <p>Captain: <strong>{team.captainName}</strong></p>
            <p>{team.memberCount}/5 members</p>
            {team.recruitmentOpen && <span className="match-badge verified">Recruiting</span>}
          </div>
        </div>
      </section>
      <section className="section">
        <h2>Details</h2>
        <div className="detail-grid">
          <div className="detail-item"><strong>Game</strong><span>{team.gameId === "valorant" ? "Valorant" : "League of Legends"}</span></div>
          <div className="detail-item"><strong>Rank Range</strong><span>{team.rankRange}</span></div>
          <div className="detail-item"><strong>Schedule</strong><span>{team.schedule}</span></div>
          <div className="detail-item"><strong>Needed Roles</strong><span>{team.neededRoles.join(", ")}</span></div>
        </div>
      </section>
      <button className="primary-action full" onClick={() => alert("Request sent to captain!")}>Apply to Team</button>
    </div>
  );
}
