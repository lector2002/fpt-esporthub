"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supportedGames, valorantRoles, lolRoles } from "@fpt-esporthub/shared";
import { createTeam } from "lib/api";

export default function CreateTeamPage() {
  const router = useRouter();
  const [gameId, setGameId] = useState("");
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [rankRange, setRankRange] = useState("");
  const [schedule, setSchedule] = useState("");
  const [neededRoles, setNeededRoles] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const roles = gameId === "valorant" ? valorantRoles : gameId === "league_of_legends" ? lolRoles : [];
  const toggleRole = (role: string) => {
    setNeededRoles((current) => current.includes(role) ? current.filter((item) => item !== role) : [...current, role]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const [rankMin, rankMax] = (rankRange || "Gold-Diamond").split("-").map((item) => item.trim());
      await createTeam({
        name,
        game: gameId || "valorant",
        rankMin: rankMin || "Gold",
        rankMax: rankMax || rankMin || "Diamond",
        neededRoles,
        schedule: schedule.split(",").map((item) => item.trim()).filter(Boolean),
        goals: ["find_members"],
        communicationStyle: "try_hard",
        description,
      });
      router.push("/teams");
    } catch {
      setError("Chưa tạo được team. Kiểm tra đăng nhập, API và PostgreSQL.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell narrow-page">
      <div className="page-header">
        <div>
          <h1>Tạo Team mới</h1>
          <p className="muted-copy">Lập squad và bắt đầu tuyển thành viên.</p>
        </div>
      </div>
      <form className="auth-form create-team-card" onSubmit={handleSubmit}>
        <label>Team Name<input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Phoenix Rising" /></label>
        <label>Tag<input type="text" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. PR" maxLength={5} /></label>
        <label>Game<select value={gameId} onChange={(e) => setGameId(e.target.value)}>
          <option value="">Select game</option>
          {supportedGames.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select></label>
        <label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your team..." rows={3} /></label>
        <label>Rank Range<input type="text" value={rankRange} onChange={(e) => setRankRange(e.target.value)} placeholder="e.g. Gold-Diamond" /></label>
        <label>Schedule<input type="text" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="e.g. Tối T2,T4,T6" /></label>
        <label>Needed Roles<div className="option-grid mini">
          {roles.map((r) => <button key={r.id} className={`option-card mini ${neededRoles.includes(r.label) ? "selected" : ""}`} onClick={(e) => { e.preventDefault(); toggleRole(r.label); }}>{r.label}</button>)}
        </div></label>
        <div className="form-actions">
          <a href="/teams" className="secondary-action full">Hủy</a>
          <button type="submit" className="primary-action full" disabled={loading}>{loading ? "Đang tạo..." : "Tạo Team"}</button>
        </div>
        {error && <p className="hint">{error}</p>}
      </form>
    </div>
  );
}
