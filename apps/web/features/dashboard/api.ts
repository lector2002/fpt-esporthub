"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { GameSlug } from "@/lib/contracts";
import type { DashboardView } from "./types";

export const DASHBOARD_QUERY_KEY = ["dashboard"] as const;

export function useDashboard(game: GameSlug | null) {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, game],
    queryFn: () => api<DashboardView>(`/profiles/dashboard?game=${game}`),
    enabled: game !== null,
  });
}
