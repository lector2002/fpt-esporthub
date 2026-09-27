"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useShellMessages } from "@/features/shell/messages";
import { isNavActive, visibleNavItems } from "@/features/shell/nav-items";
import type { SessionUser } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand-mark";

/** Larger than the shadcn default: 40px rows, 20px icons; centered in the collapsed rail. */
const ITEM = "h-10 gap-3 px-3 text-[0.9375rem] [&_svg]:size-5 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-2.5!";

export function AppSidebar({ user }: { user: SessionUser }) {
  const { t } = useShellMessages();
  const pathname = usePathname();
  const items = visibleNavItems(user.role === "ADMIN");
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const toggleLabel = t(collapsed ? "expandSidebar" : "collapseSidebar");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip={t("brand")}
              className="gap-3 px-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-0.5!"
            >
              <Link href="/dashboard">
                <BrandMark className="size-9!" />
                <span className="truncate text-base font-semibold group-data-[collapsible=icon]:hidden">{t("brand")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu aria-label={t("navigation")} className="gap-1.5">
              {items.map((item) => {
                const label = t(item.labelKey);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isNavActive(pathname, item)}
                      tooltip={label}
                      className={cn(ITEM, "data-[active=true]:bg-primary/10! data-[active=true]:text-primary!")}
                    >
                      <Link href={item.href}>
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
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={toggleLabel} onClick={toggleSidebar} className={cn(ITEM, "text-muted-foreground")}>
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
              <span>{toggleLabel}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
