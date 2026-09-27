"use client";

import { useId, useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/common/user-avatar";
import { useSession } from "@/lib/session";
import { declineCall, joinCall } from "../call-controller";
import { failureKey, useVoiceMessages } from "../messages";
import { upsertCall, useVoiceState } from "../store";

/** Accept / Decline card for a call that is ringing the viewer. Shown on every app page, hidden while in a call. */
export function IncomingCall() {
  const { t } = useVoiceMessages();
  const { user } = useSession();
  const voice = useVoiceState();
  const titleId = useId();
  const [pending, setPending] = useState(false);
  if (!user || voice.session) return null;

  const call = Object.values(voice.calls).find((item) => item.ringing.some((r) => r.userId === user.id));
  if (!call) return null;
  const caller = call.participants.find((p) => p.userId === call.startedBy)?.displayName ?? call.participants[0]?.displayName ?? "";

  const accept = async () => {
    setPending(true);
    const outcome = await joinCall(call, user.id);
    setPending(false);
    if (!outcome.ok) toast.error(t(failureKey(outcome.reason)));
  };
  const decline = () => {
    declineCall(call.id);
    upsertCall({ ...call, ringing: call.ringing.filter((r) => r.userId !== user.id) });
  };

  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      className="fixed inset-x-4 top-16 z-50 flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg md:inset-x-auto md:right-6 md:w-80"
    >
      <UserAvatar name={caller} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{t("incomingTitle")}</p>
        <p id={titleId} className="truncate text-sm font-semibold">
          {t("incomingFrom", { name: caller })}
        </p>
      </div>
      <Button variant="destructive" size="icon-lg" aria-label={t("decline")} onClick={decline} disabled={pending}>
        <PhoneOff />
      </Button>
      <Button size="icon-lg" className="bg-success text-background hover:bg-success/80" aria-label={t("accept")} onClick={() => void accept()} disabled={pending}>
        <Phone />
      </Button>
    </div>
  );
}
