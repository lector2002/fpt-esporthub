"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { gameSlug, type GameSlug, type PlayerProfile } from "./contracts";
import { useSession } from "./session";

const GAME_KEY = "fpt-esporthub-game";

interface GameValue {
  /** Active game, or null while the session loads or the user has no profile yet. */
  game: GameSlug | null;
  /** The signed-in user's profile for the active game. */
  profile: PlayerProfile | null;
  /** Games the user has a profile for, in creation order. */
  games: GameSlug[];
  setGame: (game: GameSlug) => void;
}

const GameContext = createContext<GameValue | null>(null);

function readStoredGame(): GameSlug | null {
  try {
    const value = window.localStorage.getItem(GAME_KEY);
    return value === "valorant" || value === "league_of_legends" ? value : null;
  } catch {
    return null;
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { profiles } = useSession();
  const [stored, setStored] = useState<GameSlug | null>(null);

  useEffect(() => setStored(readStoredGame()), []);

  const value = useMemo<GameValue>(() => {
    const games = profiles.map((profile) => gameSlug(profile.game));
    const game = stored && games.includes(stored) ? stored : (games[0] ?? null);
    return {
      game,
      profile: profiles.find((profile) => gameSlug(profile.game) === game) ?? null,
      games,
      setGame: (next) => {
        setStored(next);
        try {
          window.localStorage.setItem(GAME_KEY, next);
        } catch {
          // Storage blocked; the choice still applies for this visit.
        }
      },
    };
  }, [profiles, stored]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useActiveGame() {
  const value = useContext(GameContext);
  if (!value) throw new Error("useActiveGame must be used inside GameProvider");
  return value;
}
