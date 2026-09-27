"use client";

import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { EmptyState, ListSkeleton } from "@/components/common/query-state";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { useTeamMessages } from "../messages";

/** Shown instead of a game-scoped view while the session loads or when the user has no game profile. */
export function NoGameState() {
  const { status } = useSession();
  const { t } = useTeamMessages();
  if (status === "loading") return <ListSkeleton />;
  return (
    <EmptyState
      icon={Gamepad2}
      title={t("noGameTitle")}
      description={t("noGameDescription")}
      action={
        <Button asChild>
          <Link href="/onboarding">{t("createProfile")}</Link>
        </Button>
      }
    />
  );
}
