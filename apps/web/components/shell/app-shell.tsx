"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import type { SessionUser } from "@/lib/contracts";
import { DailyReward } from "@/features/credits/components/daily-reward";
import { PetWalker } from "@/features/cosmetics/components/pet-walker";
import { useSession } from "@/lib/session";
import { AppSidebar } from "./app-sidebar";
import { MobileTabBar } from "./mobile-tab-bar";
import { TopBar } from "./top-bar";

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const { profiles } = useSession();
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <TopBar user={user} />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-32 md:px-6 md:pb-24">{children}</main>
      </div>
      {profiles.length > 0 && <MobileTabBar />}
      <PetWalker aboveTabBar={profiles.length > 0} />
      <DailyReward />
    </SidebarProvider>
  );
}
