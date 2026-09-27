"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, SESSION_EXPIRED_EVENT, api, clearToken, getToken } from "./api-client";
import type { PlayerProfile, SessionUser } from "./contracts";

type SessionStatus = "loading" | "authenticated" | "unauthenticated" | "error";

interface SessionValue {
  status: SessionStatus;
  user: SessionUser | null;
  profiles: PlayerProfile[];
  error: Error | null;
  /** Re-read user + profiles, e.g. after login or onboarding. */
  refresh: () => Promise<unknown>;
  logout: () => void;
}

export const SESSION_QUERY_KEY = ["session"] as const;

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    setHasToken(Boolean(getToken()));
    const onExpired = () => {
      setHasToken(false);
      queryClient.clear();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [queryClient]);

  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => api<{ user: SessionUser; profiles: PlayerProfile[] }>("/profiles/me"),
    enabled: hasToken === true,
    retry: (count, error) => !(error instanceof ApiError && error.status === 401) && count < 2,
  });

  const value = useMemo<SessionValue>(() => {
    const status: SessionStatus =
      hasToken === null || (hasToken && query.isPending)
        ? "loading"
        : !hasToken || (query.error instanceof ApiError && query.error.status === 401)
          ? "unauthenticated"
          : query.isError
            ? "error"
            : "authenticated";
    return {
      status,
      user: query.data?.user ?? null,
      profiles: query.data?.profiles ?? [],
      error: query.error,
      refresh: async () => {
        setHasToken(Boolean(getToken()));
        return queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      },
      logout: () => {
        clearToken();
        setHasToken(false);
        queryClient.clear();
      },
    };
  }, [hasToken, query.data, query.error, query.isError, query.isPending, queryClient]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
