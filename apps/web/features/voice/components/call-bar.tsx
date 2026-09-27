"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeadphoneOff, Headphones, Mic, MicOff, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/common/user-avatar";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { leaveCall, toggleDeafen, toggleMute } from "../call-controller";
import { useVoiceMessages } from "../messages";
import { currentCall, currentRoom, useVoiceState } from "../store";
import type { CallInfo, CallSession, RoomInfo } from "../types";

type CallStatus = "preparing" | "ringing" | "connecting" | "connected";

function callStatus(call: CallInfo | null, session: CallSession, selfId: string): CallStatus {
  if (!call) return "preparing";
  if (!call.connectedAt) return "ringing";
  const remotes = call.participants.filter((p) => p.userId !== selfId);
  return remotes.some((p) => session.peers[p.userId] === "connected") ? "connected" : "connecting";
}

/** Sitting alone in a room counts as connected. */
function roomStatus(room: RoomInfo | null, session: CallSession, selfId: string): CallStatus {
  if (!room) return "preparing";
  const remotes = room.participants.filter((p) => p.userId !== selfId);
  if (remotes.length === 0) return "connected";
  return remotes.some((p) => session.peers[p.userId] === "connected") ? "connected" : "connecting";
}

export const roomHref = (teamId: string) => `/teams/${teamId}/room`;

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <span className="tabular-nums">{formatElapsed(now - new Date(since).getTime())}</span>;
}

/**
 * Floating in-call controls. Sits just below the top bar (full width on mobile, right-aligned from `md:`),
 * so it never covers the chat composer, the chat bubble or the mobile tab bar.
 */
export function CallBar() {
  const { t } = useVoiceMessages();
  const { user } = useSession();
  const voice = useVoiceState();
  const pathname = usePathname();
  const session = voice.session;
  if (!session || !user) return null;
  const isRoom = session.kind === "room";
  // The room page has its own voice panel from lg: up.
  const href = session.href ?? roomHref(session.key);
  const onRoomPage = isRoom && pathname === href;

  const call = currentCall(voice);
  const room = currentRoom(voice);
  const status = isRoom ? roomStatus(room, session, user.id) : callStatus(call, session, user.id);
  const self = { userId: user.id, displayName: user.displayName, joinedAt: "", muted: session.muted, deafened: session.deafened };
  const participants: ParticipantAvatarProps["participant"][] = (isRoom ? room?.participants : call?.participants) ?? [self];
  const label = isRoom ? (
    <Link href={href} className="hover:underline">
      {status === "connected" ? session.label : t("connecting")}
    </Link>
  ) : status === "connected" && call?.connectedAt ? (
    <Elapsed since={call.connectedAt} />
  ) : status === "ringing" ? (
    t("calling")
  ) : (
    t("connecting")
  );

  return (
    <div
      role="region"
      aria-label={t("callBar")}
      data-call-status={status}
      className={cn(
        "fixed inset-x-4 top-16 z-40 flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-lg md:inset-x-auto md:right-6",
        onRoomPage && "lg:hidden",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
        <span className={cn("size-2 shrink-0 rounded-full", status === "connected" ? "bg-success" : "animate-pulse bg-warning")} aria-hidden />
        <span className="truncate text-sm font-medium" aria-live="polite">
          {label}
        </span>
      </div>
      <ul className="flex items-center -space-x-1.5">
        {participants.map((participant) => (
          <ParticipantAvatar key={participant.userId} participant={participant} session={session} selfId={user.id} />
        ))}
      </ul>
      <div className="flex items-center gap-1">
        <Button
          variant={session.muted ? "destructive" : "secondary"}
          size="icon"
          aria-pressed={session.muted}
          aria-label={session.muted ? t("unmute") : t("mute")}
          disabled={isRoom ? !room : !call}
          onClick={toggleMute}
        >
          {session.muted ? <MicOff /> : <Mic />}
        </Button>
        {isRoom && (
          <Button
            variant={session.deafened ? "destructive" : "secondary"}
            size="icon"
            aria-pressed={session.deafened}
            aria-label={session.deafened ? t("undeafen") : t("deafen")}
            disabled={!room}
            onClick={toggleDeafen}
          >
            {session.deafened ? <HeadphoneOff /> : <Headphones />}
          </Button>
        )}
        <Button variant="destructive" size="icon" aria-label={isRoom ? t("leaveRoom") : t("leave")} onClick={leaveCall}>
          <PhoneOff />
        </Button>
      </div>
    </div>
  );
}

interface ParticipantAvatarProps {
  participant: { userId: string; displayName: string; muted: boolean; deafened?: boolean };
  session: CallSession;
  selfId: string;
}

function ParticipantAvatar({ participant, session, selfId }: ParticipantAvatarProps) {
  const { t } = useVoiceMessages();
  const isSelf = participant.userId === selfId;
  // Own mute is applied locally at once; peers' mute comes from the server.
  const muted = isSelf ? session.muted : participant.muted;
  const deafened = isSelf ? session.deafened : Boolean(participant.deafened);
  const speaking = Boolean(session.speaking[participant.userId]) && !muted;
  const connection = isSelf ? undefined : (session.peers[participant.userId] ?? "new");
  const name = isSelf ? t("you") : participant.displayName;
  const state = deafened
    ? t("deafened")
    : muted
    ? t("muted")
    : connection === "failed" || connection === "disconnected"
      ? t("peerFailed")
      : connection && connection !== "connected"
        ? t("peerConnecting")
        : speaking
          ? t("speaking")
          : null;
  const description = state ? `${name}, ${state}` : name;

  return (
    <li
      data-user-id={participant.userId}
      data-connection-state={connection}
      data-speaking={speaking || undefined}
      data-muted={muted || undefined}
      className="relative"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span role="img" tabIndex={0} aria-label={description} className="inline-flex rounded-full">
            <UserAvatar
              name={participant.displayName}
              className={cn(
                "size-8 ring-2 ring-card transition-shadow",
                speaking && "ring-success",
                (connection === "failed" || connection === "disconnected") && "opacity-50",
              )}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent>{description}</TooltipContent>
      </Tooltip>
      {muted && (
        <span className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-background ring-2 ring-card" aria-hidden>
          {deafened ? <HeadphoneOff className="size-2.5" /> : <MicOff className="size-2.5" />}
        </span>
      )}
    </li>
  );
}
