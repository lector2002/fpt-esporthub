"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supportedGames, valorantRoles, lolRoles, valorantRanks, lolRanks, playerGoals, communicationStyles } from "@fpt-esporthub/shared";
import { saveOnboarding } from "lib/api";

type Step = 1 | 2 | 3 | 4 | 5;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [gameId, setGameId] = useState("");
  const [rankLabel, setRankLabel] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [schedule, setSchedule] = useState("");
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [commStyleIds, setCommStyleIds] = useState<string[]>([]);
  const [riotId, setRiotId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const ranks = gameId === "valorant" ? valorantRanks : gameId === "league_of_legends" ? lolRanks : [];
  const roles = gameId === "valorant" ? valorantRoles : gameId === "league_of_legends" ? lolRoles : [];

  const toggleLimit = (id: string, list: string[], setter: (v: string[]) => void, limit: number) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : list.length < limit ? [...list, id] : list);
  };

  const completeSetup = async () => {
    setError("");
    setLoading(true);
    try {
      await saveOnboarding({
        game: gameId,
        rankLabel,
        role: roleLabel,
        schedule,
        goals: goalIds,
        communicationStyles: commStyleIds,
        riotId,
      });
      router.push("/dashboard");
    } catch {
      setError("Could not save onboarding. Sign in first and complete all required fields.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">FPT EsportHub</p>
        <h2 className="auth-title">Set Up Your Profile</h2>
        <div className="step-indicator">Step {step} of 5</div>

        {step === 1 && (
          <div className="onboarding-step">
            <h3>Choose your game</h3>
            <div className="option-grid">
              {supportedGames.map((g) => (
                <button key={g.id} className={`option-card ${gameId === g.id ? "selected" : ""}`} onClick={() => setGameId(g.id)}>
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <h3>Your rank and role</h3>
            <label>Rank</label>
            <select value={rankLabel} onChange={(e) => setRankLabel(e.target.value)}>
              <option value="">Select rank</option>
              {ranks.map((r) => <option key={r.sort} value={r.label}>{r.label}</option>)}
            </select>
            <label>Role</label>
            <div className="option-grid">
              {roles.map((r) => (
                <button key={r.id} className={`option-card ${roleLabel === r.label ? "selected" : ""}`} onClick={() => setRoleLabel(r.label)}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step">
            <h3>Your play schedule</h3>
            <label>When do you usually play?</label>
            <input type="text" placeholder="e.g. Tối T2-T6, cuối tuần" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
          </div>
        )}

        {step === 4 && (
          <div className="onboarding-step">
            <h3>Your goals and style</h3>
            <p>Goals (max 2)</p>
            <div className="option-grid">
              {playerGoals.map((g) => (
                <button key={g.id} className={`option-card ${goalIds.includes(g.id) ? "selected" : ""}`} onClick={() => toggleLimit(g.id, goalIds, setGoalIds, 2)}>
                  {g.label}
                </button>
              ))}
            </div>
            <p>Communication style (max 2)</p>
            <div className="option-grid">
              {communicationStyles.map((s) => (
                <button key={s.id} className={`option-card ${commStyleIds.includes(s.id) ? "selected" : ""}`} onClick={() => toggleLimit(s.id, commStyleIds, setCommStyleIds, 2)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="onboarding-step">
            <h3>Riot ID (optional)</h3>
            <label>Riot ID</label>
            <input type="text" placeholder="YourName#Tag" value={riotId} onChange={(e) => setRiotId(e.target.value)} />
            <p className="hint">Your account will start as Self-reported until verified.</p>
          </div>
        )}

        <div className="onboarding-actions">
          {step > 1 && <button className="secondary-action" onClick={() => setStep((step - 1) as Step)}>Back</button>}
          {error && <p className="hint">{error}</p>}
          {step < 5 ? (
            <button className="primary-action" onClick={() => setStep((step + 1) as Step)} disabled={step === 1 && !gameId}>Next</button>
          ) : (
            <button className="primary-action" onClick={completeSetup} disabled={loading || !gameId || !rankLabel || !roleLabel || !schedule}>{loading ? "Saving..." : "Complete Setup"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
