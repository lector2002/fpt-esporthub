"use client";

import { useQuery } from "@tanstack/react-query";
import type { GameSlug } from "@/lib/contracts";
import { VALORANT_AGENTS } from "./options";

const DDRAGON = "https://ddragon.leagueoflegends.com";

export interface MainOption {
  id: string;
  label: string;
  /** LoL only: champion square from Data Dragon. */
  imageUrl: string | null;
}

async function fetchChampions(): Promise<MainOption[]> {
  const [version] = (await (await fetch(`${DDRAGON}/api/versions.json`)).json()) as string[];
  const { data } = (await (await fetch(`${DDRAGON}/cdn/${version}/data/en_US/champion.json`)).json()) as {
    data: Record<string, { id: string; name: string }>;
  };
  return Object.values(data)
    .map((champion) => ({ id: champion.id, label: champion.name, imageUrl: `${DDRAGON}/cdn/${version}/img/champion/${champion.id}.png` }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Champions (current Data Dragon patch) for LoL, the agent list for Valorant. */
export function useMainOptions(game: GameSlug) {
  return useQuery({
    queryKey: ["questionnaire", "mains", game],
    queryFn: () =>
      game === "league_of_legends" ? fetchChampions() : Promise.resolve(VALORANT_AGENTS.map((agent) => ({ ...agent, imageUrl: `/art/valorant/icons/${agent.id}.webp` }))),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
