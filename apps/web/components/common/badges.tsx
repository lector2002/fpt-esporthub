"use client";

import { BadgeCheck, Link2, ShieldAlert, ShieldCheck, Shuffle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GAMES, type GameSlug, type ReputationBadge as Reputation, type VerificationStatus } from "@/lib/contracts";
import { defineMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const useMessages = defineMessages({
  vi: { NEW: "Mới", VERIFIED: "Đã xác minh", TRUSTED: "Uy tín", CAUTION: "Cần lưu ý", riot: "Riot", linked: "Đã liên kết", aram: "ARAM" },
  en: { NEW: "New", VERIFIED: "Verified", TRUSTED: "Trusted", CAUTION: "Caution", riot: "Riot", linked: "Linked", aram: "ARAM" },
});

const REPUTATION = {
  NEW: { icon: Sparkles, className: "text-muted-foreground" },
  VERIFIED: { icon: ShieldCheck, className: "text-sky-300" },
  TRUSTED: { icon: ShieldCheck, className: "text-success" },
  CAUTION: { icon: ShieldAlert, className: "text-warning" },
} as const;

/** "New" is everyone's starting state, so it only shows where a column needs a value (`showNew`, admin). */
export function ReputationBadge({ badge, showNew = false, className }: { badge: Reputation; showNew?: boolean; className?: string }) {
  const { t } = useMessages();
  if (badge === "NEW" && !showNew) return null;
  const { icon: Icon, className: tone } = REPUTATION[badge];
  return (
    <Badge variant="outline" className={cn(tone, className)}>
      <Icon /> {t(badge)}
    </Badge>
  );
}

export function VerificationBadge({ status, className }: { status: VerificationStatus; className?: string }) {
  const { t } = useMessages();
  if (status === "LINKED") {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        <Link2 /> {t("linked")}
      </Badge>
    );
  }
  if (status !== "VERIFIED") return null;
  return (
    <Badge variant="outline" className={cn("text-sky-300", className)}>
      <BadgeCheck /> {t("riot")}
    </Badge>
  );
}

export function GameBadge({ game, className }: { game: GameSlug; className?: string }) {
  return (
    <Badge variant="outline" className={cn(game === "valorant" ? "text-valorant" : "text-lol", className)}>
      {GAMES[game].short}
    </Badge>
  );
}

/** Marks an ARAM profile, team or match. */
export function AramBadge({ className }: { className?: string }) {
  const { t } = useMessages();
  return (
    <Badge variant="outline" className={cn("text-lol", className)}>
      <Shuffle aria-hidden /> {t("aram")}
    </Badge>
  );
}
