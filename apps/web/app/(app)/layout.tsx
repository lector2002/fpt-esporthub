"use client";

import { AppShell } from "@/components/shell/app-shell";
import { AuthGate } from "@/components/shell/auth-gate";
import { useSession } from "@/lib/session";
import { FloatingHub } from "./floating-hub";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profiles } = useSession();
  return (
    <AuthGate>
      {(user) => (
        <>
          <AppShell user={user}>{children}</AppShell>
          {profiles.length > 0 && <FloatingHub />}
        </>
      )}
    </AuthGate>
  );
}
