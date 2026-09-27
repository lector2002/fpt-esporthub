"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu, PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAdminMessages } from "@/features/admin/messages";
import { ADMIN_NAV, adminHref } from "@/features/admin/nav";
import { useShellMessages } from "@/features/shell/messages";
import type { SessionUser } from "@/lib/contracts";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { SIDEBAR_ITEM } from "./app-sidebar";
import { BrandMark } from "./brand-mark";
import { UserMenu } from "./user-menu";

/** The admin console: its own grouped navigation, no player features (game switcher, wallet, inbox, chat hub). */
export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <AdminTopBar user={user} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-16 md:px-6">{children}</main>
      </div>
    </SidebarProvider>
  );
}

function AdminTopBar({ user }: { user: SessionUser }) {
  const { t } = useAdminMessages();
  const { toggleSidebar } = useSidebar();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background px-4 md:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar} aria-label={t("openMenu")}>
        <Menu />
      </Button>
      <span className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4 text-primary" aria-hidden />
        {t("console")}
      </span>
      <div className="ml-auto">
        <UserMenu user={user} />
      </div>
    </header>
  );
}

function AdminSidebar() {
  const { t } = useAdminMessages();
  const shell = useShellMessages();
  const pathname = usePathname();
  const { profiles } = useSession();
  const { state, toggleSidebar, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const toggleLabel = shell.t(collapsed ? "expandSidebar" : "collapseSidebar");
  const close = () => setOpenMobile(false);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip={t("console")}
              className="gap-3 px-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-0.5!"
            >
              <Link href="/admin" onClick={close}>
                <BrandMark className="size-9!" />
                <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-base font-semibold">{shell.t("brand")}</span>
                  <span className="truncate text-xs text-primary">{t("console")}</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label={t("console")} className="contents">
          {ADMIN_NAV.map((group) => (
            <SidebarGroup key={group.labelKey}>
              <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {group.items.map((item) => {
                    const href = adminHref(item.section);
                    const active = item.section ? pathname.startsWith(href) : pathname === href;
                    const label = t(item.labelKey);
                    return (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={label}
                          className={cn(SIDEBAR_ITEM, "data-[active=true]:bg-primary/10! data-[active=true]:text-primary!")}
                        >
                          <Link href={href} onClick={close} aria-current={active ? "page" : undefined}>
                            <item.icon />
                            <span>{label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {profiles.length > 0 && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={t("backToApp")} className={cn(SIDEBAR_ITEM, "text-muted-foreground")}>
                <Link href="/dashboard">
                  <ArrowLeft />
                  <span>{t("backToApp")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem className="max-md:hidden">
            <SidebarMenuButton tooltip={toggleLabel} onClick={toggleSidebar} className={cn(SIDEBAR_ITEM, "text-muted-foreground")}>
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
              <span>{toggleLabel}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
