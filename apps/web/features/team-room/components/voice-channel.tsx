"use client";

import { useState } from "react";
import { HeadphoneOff, Headphones, Loader2, Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/common/user-avatar";
import { joinRoom, leaveCall, toggleDeafen, toggleMute } from "@/features/voice/call-controller";
import { failureKey, useVoiceMessages } from "@/features/voice/messages";
import { useVoiceState } from "@/features/voice/store";
import type { CallSession, RoomParticipant } from "@/features/voice/types";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useTeamRoomMessages } from "../messages";

/** A voice room: a team, or a community voice channel (`id` = channel id, `name` = community name). */
export interface TeamRef {
  id: string;
  name: string;
  members?: { userId: string; avatarKey: string | null }[];
  /** Channel name; team rooms show "Voice". */
  channel?: string;
  /** Page the room lives on, for the call bar link. */
  href?: string;
}

export function useRoomVoice(teamId: string) {
  const voice = useVoiceState();
  const room = voice.rooms[teamId] ?? null;
  const session = voice.session?.kind === "room" && voice.session.key === teamId ? voice.session : null;
  return { room, session, joined: Boolean(session?.callId && room) };
}

export function useJoin(team: TeamRef) {
  const { t } = useVoiceMessages();
  const { user } = useSession();
  const [pending, setPending] = useState(false);
  const join = async () => {
    if (!user) return;
    setPending(true);
    const outcome = await joinRoom(team.id, team.channel ? `${team.name} / ${team.channel}` : team.name, user.id, team.href);
    setPending(false);
    if (!outcome.ok) toast.error(t(failureKey(outcome.reason)));
  };
  return { join, pending };
}

/** The team's voice channel: click to join, occupants listed underneath like Discord. */
export function VoiceChannel({ team }: { team: TeamRef }) {
  const { t } = useTeamRoomMessages();
  const { user } = useSession();
  const { room, session } = useRoomVoice(team.id);
  const { join, pending } = useJoin(team);
  const participants = room?.participants ?? [];
  const max = room?.maxParticipants ?? 5;
  const full = !session && participants.length >= max;
  const restricted = user?.status === "RESTRICTED";

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => void join()}
        disabled={Boolean(session) || full || pending || restricted}
        aria-label={full ? t("voiceFull", { max }) : t("joinVoice")}
        data-voice-channel={team.id}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:cursor-default disabled:hover:bg-transparent",
          session && "bg-muted text-foreground disabled:hover:bg-muted",
        )}
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
        <span className="flex-1 truncate text-left">{team.channel ?? t("voice")}</span>
        {participants.length > 0 && (
          <span className="text-xs tabular-nums">{t("voiceCount", { count: participants.length, max })}</span>
        )}
      </button>
      {participants.length > 0 ? (
        <ul className="flex flex-col gap-0.5 py-1 pl-6" aria-label={t("inVoice")}>
          {participants.map((participant) => (
            <VoiceOccupant
              key={participant.userId}
              participant={participant}
              imageKey={team.members?.find((member) => member.userId === participant.userId)?.avatarKey}
              session={session}
              selfId={user?.id}
            />
          ))}
        </ul>
      ) : (
        <p className="py-1 pr-2 pl-8 text-xs text-muted-foreground">{t("voiceEmpty")}</p>
      )}
    </div>
  );
}

export function VoiceOccupant({
  participant,
  imageKey,
  session,
  selfId,
}: {
  participant: RoomParticipant;
  imageKey: string | null | undefined;
  session: CallSession | null;
  selfId?: string;
}) {
  const v = useVoiceMessages().t;
  const isSelf = participant.userId === selfId;
  // Own state is applied locally at once; others come from the server.
  const muted = isSelf && session ? session.muted : participant.muted;
  const deafened = isSelf && session ? session.deafened : participant.deafened;
  // Speaking is only known while the viewer is in the room.
  const speaking = Boolean(session?.speaking[participant.userId]) && !muted;
  const name = isSelf ? v("you") : participant.displayName;
  const connection = session && !isSelf ? (session.peers[participant.userId] ?? "new") : undefined;

  return (
    <li
      data-user-id={participant.userId}
      data-connection-state={connection}
      data-speaking={speaking || undefined}
      data-muted={muted || undefined}
      data-deafened={deafened || undefined}
      className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground"
    >
      <UserAvatar name={participant.displayName} imageKey={imageKey} className={cn("size-6 ring-2 ring-transparent transition-shadow", speaking && "ring-success")} />
      <span className={cn("min-w-0 flex-1 truncate", speaking && "text-foreground")}>{participant.displayName}</span>
      {deafened ? (
        <HeadphoneOff className="size-3.5 text-destructive" aria-label={`${name}, ${v("deafened")}`} />
      ) : muted ? (
        <MicOff className="size-3.5 text-destructive" aria-label={`${name}, ${v("muted")}`} />
      ) : null}
    </li>
  );
}

/** Bottom of the channel list: the viewer, plus connection status and controls while in this room. */
export function VoicePanel({ team }: { team: TeamRef }) {
  const { t } = useTeamRoomMessages();
  const v = useVoiceMessages().t;
  const { user } = useSession();
  const { session, joined } = useRoomVoice(team.id);
  const { join, pending } = useJoin(team);
  if (!user) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-border bg-muted/30 p-2" role="region" aria-label={v("callBar")}>
      {session && (
        <div className="flex items-center gap-2 px-1">
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-semibold", joined ? "text-success" : "text-warning")} aria-live="polite">
              {joined ? t("voiceConnected") : t("voiceConnecting")}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {team.channel ?? t("voice")} / {team.name}
            </p>
          </div>
          <IconButton label={v("leaveRoom")} onClick={leaveCall} destructive>
            <PhoneOff />
          </IconButton>
        </div>
      )}
      <div className="flex items-center gap-2 px-1">
        <UserAvatar name={user.displayName} imageKey={user.avatarKey} className="size-8" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{user.displayName}</span>
        {session ? (
          <>
            <IconButton label={session.muted ? v("unmute") : v("mute")} pressed={session.muted} onClick={toggleMute} disabled={!joined}>
              {session.muted ? <MicOff /> : <Mic />}
            </IconButton>
            <IconButton label={session.deafened ? v("undeafen") : v("deafen")} pressed={session.deafened} onClick={toggleDeafen} disabled={!joined}>
              {session.deafened ? <HeadphoneOff /> : <Headphones />}
            </IconButton>
          </>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => void join()} disabled={pending || user.status === "RESTRICTED"}>
            {pending ? <Loader2 className="animate-spin" /> : <Volume2 />} {t("joinVoice")}
          </Button>
        )}
      </div>
    </div>
  );
}

interface IconButtonProps {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  destructive?: boolean;
}

export function IconButton({ label, onClick, children, pressed, disabled, destructive }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          disabled={disabled}
          onClick={onClick}
          className={cn((destructive || pressed) && "text-destructive hover:text-destructive")}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
