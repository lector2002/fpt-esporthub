"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import type { BlockedUser, CreateReportInput, MyReport } from "./types";

export const BLOCKS_QUERY_KEY = ["blocks"] as const;
export const MY_REPORTS_QUERY_KEY = ["reports", "mine"] as const;

/** Blocking changes who shows up in matching and player lists. */
const BLOCK_DEPENDENT_KEYS = [BLOCKS_QUERY_KEY, ["matching"], ["players"]] as const;

export function useBlockedUsers() {
  const { status } = useSession();
  return useQuery({
    queryKey: BLOCKS_QUERY_KEY,
    queryFn: async () => (await api<{ blocks: BlockedUser[] }>("/blocks")).blocks,
    enabled: status === "authenticated",
  });
}

function useInvalidateBlocks() {
  const queryClient = useQueryClient();
  return () => Promise.all(BLOCK_DEPENDENT_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function useBlockUser() {
  const invalidate = useInvalidateBlocks();
  return useMutation({
    mutationFn: (userId: string) => api<{ block: BlockedUser }>("/blocks", { method: "POST", body: { userId } }),
    onSuccess: invalidate,
  });
}

export function useUnblockUser() {
  const invalidate = useInvalidateBlocks();
  return useMutation({
    mutationFn: (userId: string) => api<{ success: true }>(`/blocks/${encodeURIComponent(userId)}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReportInput) => api<{ report: MyReport }>("/reports", { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_REPORTS_QUERY_KEY }),
  });
}
