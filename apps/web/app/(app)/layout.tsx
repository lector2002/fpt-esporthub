"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "@/components/shell/admin-shell";
import { AppShell } from "@/components/shell/app-shell";
import { AuthGate, isAdminPath } from "@/components/shell/auth-gate";
import { useSession } from "@/lib/session";
import { FloatingHub } from "./floating-hub";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profiles } = useSession();
  const pathname = usePathname();
  return (
    <AuthGate>
      {(user) =>
        user.role === "ADMIN" && isAdminPath(pathname) ? (
          <AdminShell user={user}>{children}</AdminShell>
        ) : (
          <>
            <AppShell user={user}>{children}</AppShell>
            {profiles.length > 0 && <FloatingHub />}
          </>
        )
      }
    </AuthGate>
  );
}
