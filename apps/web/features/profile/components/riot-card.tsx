"use client";

import { useState } from "react";
import { BadgeCheck, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RIOT_ID_PATTERN } from "@/features/riot/format";
import type { PlayerProfile } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { useProfileMessages } from "../messages";
import { useDraft } from "./profile-draft";

export function RiotStatusBadge({ profile }: { profile: PlayerProfile }) {
  const { t } = useProfileMessages();
  const verified = profile.verificationStatus === "VERIFIED";
  return (
    <Badge variant="outline" className={cn(verified ? "text-success" : "text-muted-foreground")}>
      {verified && <BadgeCheck />}
      {profile.verificationStatus === "LINKED" && <Link2 />} {t(`status_${profile.verificationStatus}`)}
    </Badge>
  );
}

export function RiotCard({ profile }: { profile: PlayerProfile }) {
  const { t } = useProfileMessages();
  const [riotId, setRiotId] = useState(profile.riotId ?? "");

  const value = riotId.trim();
  const invalid = value !== "" && !RIOT_ID_PATTERN.test(value);
  const dirty = value !== (profile.riotId ?? "");

  useDraft("riot", { patch: dirty ? { riotId: value || null } : null, invalid });

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor="profile-riot-id">{t("riotId")}</FieldLabel>
      <Input
        id="profile-riot-id"
        value={riotId}
        onChange={(event) => setRiotId(event.target.value)}
        placeholder="Name#TAG"
        aria-invalid={invalid || undefined}
        autoComplete="off"
        spellCheck={false}
      />
      {invalid ? <FieldError>{t("riotIdError")}</FieldError> : <FieldDescription>{t("riotIdHint")}</FieldDescription>}
    </Field>
  );
}
