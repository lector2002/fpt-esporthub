"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ErrorState } from "@/components/common/query-state";
import { SESSION_EXPIRED_EVENT } from "@/lib/api-client";
import type { SessionUser } from "@/lib/contracts";
import { useSession } from "@/lib/session";
import { ShellSkeleton } from "./shell-skeleton";

const isAdminPath = (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/");

const SignOutContext = createContext<(() => void) | null>(null);

export function useSignOut() {
  const signOut = useContext(SignOutContext);
  if (!signOut) throw new Error("useSignOut must be used inside AuthGate");
  return signOut;
}

/**
 * Renders children only for a signed-in user with at least one game profile.
 * Admins without a player profile may use `/admin` only; they are sent there instead of onboarding.
 * One redirect per mount: expiry, sign-out and the status-based redirects share `redirectedRef`
 * so the generic `/login?next=` redirect never overrides a more specific one.
 */
export function AuthGate({ children }: { children: (user: SessionUser) => React.ReactNode }) {
  const { status, user, profiles, error, refresh, logout } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const redirectedRef = useRef(false);

  useEffect(() => {
    const onExpired = () => {
      redirectedRef.current = true;
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?expired=1&next=${encodeURIComponent(next)}`);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [router]);

  useEffect(() => {
    if (redirectedRef.current) return;
    if (status === "unauthenticated") {
      redirectedRef.current = true;
      const next = `${pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    } else if (status === "authenticated" && profiles.length === 0) {
      if (user?.role === "ADMIN") {
        if (isAdminPath(pathname)) return;
        redirectedRef.current = true;
        router.replace("/admin");
      } else {
        redirectedRef.current = true;
        router.replace("/onboarding");
      }
    }
  }, [status, profiles.length, user?.role, pathname, router]);

  // Full page load: drops every in-memory trace of the session (sockets, calls, caches). A client-side
  // replace could also land on a stale `/login?next=...` from the production router cache.
  const signOut = useCallback(() => {
    redirectedRef.current = true;
    logout();
    window.location.replace("/login");
  }, [logout]);

  if (status === "error") {
    return (
      <div className="mx-auto flex min-h-svh w-full max-w-md items-center px-4">
        <div className="w-full">
          <ErrorState error={error} onRetry={() => void refresh()} />
        </div>
      </div>
    );
  }

  const allowed = profiles.length > 0 || (user?.role === "ADMIN" && isAdminPath(pathname));
  if (status !== "authenticated" || !user || !allowed) return <ShellSkeleton />;

  return <SignOutContext.Provider value={signOut}>{children(user)}</SignOutContext.Provider>;
}
