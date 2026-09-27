"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useBlockedUsers } from "@/features/safety/api";
import { leaveCall } from "../call-controller";
import { useVoiceMessages } from "../messages";
import { currentCall, useVoiceState } from "../store";
import { useVoiceSocket } from "../use-voice-socket";
import { CallBar } from "./call-bar";
import { IncomingCall } from "./incoming-call";

/** App-wide voice UI: incoming call card and in-call bar. Mount once, on every app page (including /inbox). */
export function VoiceLayer() {
  useVoiceSocket();
  useLeaveWhenBlocked();
  return (
    <>
      <IncomingCall />
      <CallBar />
    </>
  );
}

/** Blocking someone mid-call takes the viewer out of that call. */
function useLeaveWhenBlocked() {
  const { t } = useVoiceMessages();
  const blocks = useBlockedUsers();
  const call = currentCall(useVoiceState());
  const blockedInCall = Boolean(call && blocks.data?.some((block) => call.participants.some((p) => p.userId === block.userId)));
  const message = t("leftBlocked");

  useEffect(() => {
    if (!blockedInCall) return;
    leaveCall();
    toast(message);
  }, [blockedInCall, message]);
}
