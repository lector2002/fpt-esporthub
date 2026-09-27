"use client";

import { useState } from "react";
import { Ban, Ellipsis, Flag, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/session";
import { useBlockedUsers } from "../api";
import { useSafetyMessages } from "../messages";
import type { ReportTargetType } from "../types";
import { BlockConfirmDialog } from "./block-button";
import { ReportDialog } from "./report-button";

export interface SafetyMenuProps {
  targetType: ReportTargetType;
  targetId: string;
  targetName: string;
  /** The person behind the target: reported with it and offered for blocking. */
  owner: { id: string; name: string };
  size?: "icon" | "icon-sm";
}

/**
 * Report and block actions behind one "more" button. Hidden on the viewer's own things.
 * Dialogs live outside the menu so the menu can close normally when one opens.
 */
export function SafetyMenu({ targetType, targetId, targetName, owner, size = "icon" }: SafetyMenuProps) {
  const { t } = useSafetyMessages();
  const { user } = useSession();
  const blocks = useBlockedUsers();
  const [dialog, setDialog] = useState<"report" | "block" | null>(null);
  if (!user || user.id === owner.id) return null;

  const isBlocked = Boolean(blocks.data?.some((block) => block.userId === owner.id));
  const onOpenChange = (open: boolean) => !open && setDialog(null);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size={size} aria-label={t("moreActions")}>
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog("report")}>
            <Flag /> {t("report")}
          </DropdownMenuItem>
          <DropdownMenuItem variant={isBlocked ? "default" : "destructive"} onSelect={() => setDialog("block")}>
            {isBlocked ? <ShieldOff /> : <Ban />} {isBlocked ? t("unblock") : t("block")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog
        open={dialog === "report"}
        onOpenChange={onOpenChange}
        targetType={targetType}
        targetId={targetId}
        targetName={targetName}
      />
      <BlockConfirmDialog
        open={dialog === "block"}
        onOpenChange={onOpenChange}
        userId={owner.id}
        userName={owner.name}
        isBlocked={isBlocked}
      />
    </>
  );
}
