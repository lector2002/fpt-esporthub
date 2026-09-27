"use client";

import Link from "next/link";
import { BookOpen, ChevronDown, GraduationCap, Languages, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { ReputationBadge } from "@/components/common/badges";
import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useShellMessages } from "@/features/shell/messages";
import type { SessionUser } from "@/lib/contracts";
import type { Language } from "@/lib/i18n";
import { useSignOut } from "./auth-gate";

/** Account menu at the right of the top bar. */
export function UserMenu({ user }: { user: SessionUser }) {
  const { t, language, setLanguage } = useShellMessages();
  const signOut = useSignOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-1.5 text-sm" aria-label={t("userMenu")}>
          <UserAvatar name={user.displayName} imageKey={user.avatarKey} className="size-8" />
          <span className="hidden max-w-32 truncate lg:inline">{user.displayName}</span>
          <ChevronDown className="hidden text-muted-foreground sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2 py-2 text-foreground">
          <UserAvatar name={user.displayName} imageKey={user.avatarKey} className="size-9" />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-sm font-semibold">{user.displayName}</span>
            <ReputationBadge badge={user.reputationBadge} className="w-fit" />
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile/me">
              <UserRound /> {t("profile")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="md:hidden">
            <Link href="/coaches">
              <GraduationCap /> {t("coaching")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="md:hidden">
            <Link href="/guides">
              <BookOpen /> {t("guides")}
            </Link>
          </DropdownMenuItem>
          {user.role === "ADMIN" && (
            <DropdownMenuItem asChild className="md:hidden">
              <Link href="/admin">
                <ShieldCheck /> {t("admin")}
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-1.5">
          <Languages className="size-3.5" /> {t("language")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={language} onValueChange={(value) => setLanguage(value as Language)}>
          <DropdownMenuRadioItem value="vi">{t("langVi")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en">{t("langEn")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={signOut}>
          <LogOut /> {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
