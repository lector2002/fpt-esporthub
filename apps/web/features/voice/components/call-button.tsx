"use client";

import { useId, useState } from "react";
import { Loader2, Phone, PhoneIncoming } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/lib/session";
import { joinCall, startCall } from "../call-controller";
import { failureKey, useVoiceMessages } from "../messages";
import { useVoiceState } from "../store";

interface CallButtonProps {
  conversationId: string;
  /** A Block exists between the viewer and the other participant (either direction). */
  blocked: boolean;
  size?: "icon" | "icon-sm";
}

/** Starts a call in this conversation, or joins the one already running. Disabled with a reason tooltip. */
export function CallButton({ conversationId, blocked, size = "icon" }: CallButtonProps) {
  const { t } = useVoiceMessages();
  const { user } = useSession();
  const voice = useVoiceState();
  const reasonId = useId();
  const [pending, setPending] = useState(false);
  if (!user) return null;

  const inThisCall = voice.session?.kind === "call" && voice.session.key === conversationId;
  const active = inThisCall ? undefined : voice.calls[conversationId];
  const isFull = Boolean(active && active.participants.length >= active.maxParticipants);
  const reason = blocked
    ? t("reasonBlocked")
    : user.status === "RESTRICTED"
      ? t("reasonRestricted")
      : voice.session
        ? t("reasonInCall")
        : isFull && active
          ? t("reasonFull", { max: active.maxParticipants })
          : null;
  const label = active ? t("joinCall") : t("startCall");

  const onClick = async () => {
    setPending(true);
    const outcome = active ? await joinCall(active, user.id) : await startCall(conversationId, user.id);
    setPending(false);
    if (!outcome.ok) toast.error(t(failureKey(outcome.reason)));
  };

  const disabled = Boolean(reason) || pending;
  const button = (
    <Button
      variant={active ? "default" : "ghost"}
      size={size}
      aria-label={label}
      aria-describedby={reason ? reasonId : undefined}
      disabled={disabled}
      onClick={() => void onClick()}
      data-call-available={active ? "join" : "start"}
    >
      {pending ? <Loader2 className="animate-spin" /> : active ? <PhoneIncoming /> : <Phone />}
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Disabled buttons swallow pointer events; the span keeps the tooltip reachable. */}
        <span tabIndex={reason ? 0 : -1} className="inline-flex">
          {button}
          {reason && (
            <span id={reasonId} className="sr-only">
              {reason}
            </span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason ?? label}</TooltipContent>
    </Tooltip>
  );
}
