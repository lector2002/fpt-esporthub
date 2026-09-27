"use client";

import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { GameSlug } from "@/lib/contracts";
import { useUpdateProfile } from "../api";
import { useProfileMessages } from "../messages";

/** Visibility in Find Match. Saves on toggle, same on Home and Profile. */
export function LookingToggle({ id, game, lookingStatus }: { id: string; game: GameSlug; lookingStatus: string }) {
  const { t } = useProfileMessages();
  const update = useUpdateProfile();
  const pendingStatus = update.isPending ? update.variables?.lookingStatus : undefined;
  const checked = (pendingStatus ?? lookingStatus) === "open_to_match";

  const toggle = (next: boolean) =>
    update.mutate(
      { game, lookingStatus: next ? "open_to_match" : "not_looking" },
      {
        onSuccess: () => toast.success(next ? t("lookingOn") : t("lookingOff")),
        onError: (error) => toast.error(error.message),
      },
    );

  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} disabled={update.isPending} onCheckedChange={toggle} />
      <Label htmlFor={id}>{t("lookingToggle")}</Label>
    </div>
  );
}
