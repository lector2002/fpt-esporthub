"use client";

import { useState } from "react";
import { ShieldOff, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/common/query-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { useBlockedUsers } from "../api";
import { useSafetyMessages } from "../messages";
import type { BlockedUser } from "../types";
import { BlockConfirmDialog } from "./block-button";

export function BlockedUsersList() {
  const { t } = useSafetyMessages();
  const blocks = useBlockedUsers();

  return (
    <section className="flex flex-col gap-3" aria-labelledby="blocked-users-title">
      <h2 id="blocked-users-title" className="text-base font-semibold">
        {t("blockedUsersTitle")}
      </h2>
      <QueryState
        query={blocks}
        isEmpty={(data) => data.length === 0}
        empty={{ icon: UserX, title: t("noBlockedUsers") }}
      >
        {(data) => (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {data.map((block) => (
              <BlockedUserRow key={block.userId} block={block} />
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  );
}

function BlockedUserRow({ block }: { block: BlockedUser }) {
  const { t, language } = useSafetyMessages();
  const [open, setOpen] = useState(false);
  const date = new Date(block.blockedAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US");

  return (
    <li className="flex items-center gap-3 p-3">
      <UserAvatar name={block.displayName} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{block.displayName}</p>
        <p className="text-xs text-muted-foreground">{t("blockedOn", { date })}</p>
      </div>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ShieldOff /> {t("unblock")}
      </Button>
      <BlockConfirmDialog
        open={open}
        onOpenChange={setOpen}
        userId={block.userId}
        userName={block.displayName}
        isBlocked
      />
    </li>
  );
}
