"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSession } from "@/lib/session";

export const INBOX_COUNTS_QUERY_KEY = ["inbox-counts"] as const;

/** Pending incoming requests + unread messages, for the sidebar and bubble badges. */
export function useInboxCounts() {
  const { status } = useSession();
  return useQuery({
    queryKey: INBOX_COUNTS_QUERY_KEY,
    queryFn: () => api<{ pendingRequests: number; unreadMessages: number }>("/profiles/me/counts"),
    enabled: status === "authenticated",
    refetchInterval: 60_000,
  });
}
