"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, Hash, HeadphoneOff, Headphones, Loader2, Mic, MicOff, PhoneOff, Plus, Trash2, Users, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { ABOVE_CARD_LINK } from "@/components/common/card-link";
import { UserAvatar } from "@/components/common/user-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { IconButton, useJoin, useRoomVoice, VoiceOccupant, type TeamRef } from "@/features/team-room/components/voice-channel";
import { useTeamRoomMessages } from "@/features/team-room/messages";
import { ConfirmAction } from "@/features/teams/components/confirm-action";
import { leaveCall, toggleDeafen, toggleMute } from "@/features/voice/call-controller";
import { useVoiceMessages } from "@/features/voice/messages";
import { useVoiceState } from "@/features/voice/store";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { communityHref, useAddChannel, useLeaveCommunity, useRemoveChannel } from "../api";
import { useCommunityMessages } from "../messages";
import type { CommunityChannel, CommunityDetail, CommunityMember } from "../types";

type Kind = CommunityChannel["kind"];

/** Members shown in the side card before "See all". */
const ONLINE_PREVIEW = 8;

/** A community voice channel as the shared voice hooks see it. */
const voiceRef = (community: CommunityDetail, channel: CommunityChannel): TeamRef => ({
  id: channel.id,
  name: community.name,
  channel: channel.name,
  href: communityHref(community.id),
  members: community.members,
});

/** Side card: every voice room with who is inside; the room you are in carries its own controls. */
export function VoiceRoomsCard({ community }: { community: CommunityDetail }) {
  const { t } = useCommunityMessages();
  const [adding, setAdding] = useState(false);
  const voice = community.channels.filter((channel) => channel.kind === "voice");

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="size-4 text-primary" aria-hidden />
          {t("voiceRooms")}
        </CardTitle>
        {community.viewerRole === "owner" && (
          <CardAction>
            <Button variant="ghost" size="icon-sm" aria-label={t("addVoiceChannel")} onClick={() => setAdding(true)}>
              <Plus />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {voice.length === 0 && <p className="text-sm text-muted-foreground">{t("noVoiceRooms")}</p>}
        {voice.map((channel) => (
          <VoiceRoom key={channel.id} community={community} channel={channel} />
        ))}
      </CardContent>
      {adding && <AddChannelDialog community={community} kind="voice" onClose={() => setAdding(false)} />}
    </Card>
  );
}

function VoiceRoom({ community, channel }: { community: CommunityDetail; channel: CommunityChannel }) {
  const { t } = useCommunityMessages();
  const room = useTeamRoomMessages().t;
  const v = useVoiceMessages().t;
  const { user } = useSession();
  const ref = voiceRef(community, channel);
  const { room: info, session, joined } = useRoomVoice(channel.id);
  const { join, pending } = useJoin(ref);
  const participants = info?.participants ?? [];
  const max = info?.maxParticipants ?? 5;
  const full = participants.length >= max;
  const live = participants.length > 0;
  // The whole chip joins the room, like clicking a Discord voice channel.
  const joinable = !session && Boolean(community.viewerRole);
  const blocked = full || pending || user?.status === "RESTRICTED";

  return (
    <div
      data-voice-room={channel.id}
      className={cn(
        "relative flex flex-col gap-2 rounded-lg border p-2.5 transition-colors has-[[data-voice-channel]:focus-visible]:ring-3 has-[[data-voice-channel]:focus-visible]:ring-ring/50",
        session ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20",
        joinable && !blocked && "cursor-pointer hover:border-primary/40 hover:bg-muted/50",
      )}
    >
      {joinable && (
        <button
          type="button"
          data-voice-channel={channel.id}
          aria-label={full ? room("voiceFull", { max }) : `${t("joinRoom")} ${channel.name}`}
          disabled={blocked}
          onClick={() => void join()}
          className="absolute inset-0 z-[1] cursor-pointer rounded-lg focus-visible:outline-none disabled:cursor-default"
        />
      )}
      <div className="flex items-center gap-2">
        {pending ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
        ) : (
          <Volume2 className={cn("size-4 shrink-0", live ? "text-success" : "text-muted-foreground")} aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate font-medium">{channel.name}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{room("voiceCount", { count: participants.length, max })}</span>
        {community.viewerRole === "owner" && (
          <span className={ABOVE_CARD_LINK}>
            <DeleteChannelButton community={community} channel={channel} />
          </span>
        )}
      </div>
      {live && (
        <ul className="flex flex-col gap-0.5" aria-label={room("inVoice")}>
          {participants.map((participant) => (
            <VoiceOccupant
              key={participant.userId}
              participant={participant}
              imageKey={community.members.find((member) => member.userId === participant.userId)?.avatarKey}
              session={session}
              selfId={user?.id}
            />
          ))}
        </ul>
      )}
      {session && (
        <div className="flex items-center gap-1 border-t border-border pt-2" role="region" aria-label={v("callBar")}>
          <p className={cn("min-w-0 flex-1 truncate text-xs font-semibold", joined ? "text-success" : "text-warning")} aria-live="polite">
            {joined ? room("voiceConnected") : room("voiceConnecting")}
          </p>
          <IconButton label={session.muted ? v("unmute") : v("mute")} pressed={session.muted} onClick={toggleMute} disabled={!joined}>
            {session.muted ? <MicOff /> : <Mic />}
          </IconButton>
          <IconButton label={session.deafened ? v("undeafen") : v("deafen")} pressed={session.deafened} onClick={toggleDeafen} disabled={!joined}>
            {session.deafened ? <HeadphoneOff /> : <Headphones />}
          </IconButton>
          <IconButton label={v("leaveRoom")} onClick={leaveCall} destructive>
            <PhoneOff />
          </IconButton>
        </div>
      )}
    </div>
  );
}

export function DeleteChannelButton({ community, channel }: { community: CommunityDetail; channel: CommunityChannel }) {
  const { t } = useCommunityMessages();
  const remove = useRemoveChannel(community.id);
  return (
    <ConfirmAction
      trigger={
        <Button variant="ghost" size="icon-xs" aria-label={t("deleteChannel", { name: channel.name })} disabled={remove.isPending} className="text-muted-foreground">
          <Trash2 />
        </Button>
      }
      title={t("deleteChannelTitle", { name: channel.name })}
      description={channel.kind === "text" ? t("deleteTextHint") : t("deleteVoiceHint")}
      confirmLabel={t("delete")}
      onConfirm={() => remove.mutate(channel.id, { onError: (error) => toast.error(error.message) })}
    />
  );
}

/** Online members and who is talking; the full list (with offline) opens in a sheet. */
export function MembersCard({ community }: { community: CommunityDetail }) {
  const { t } = useCommunityMessages();
  const [open, setOpen] = useState(false);
  const presence = usePresence(community);
  const online = community.members.filter(presence.isOnline);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4 text-primary" aria-hidden />
          {t("groupCount", { label: t("online"), count: online.length })}
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            {t("seeAllMembers", { count: community.memberCount })}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-0.5">
          {online.slice(0, ONLINE_PREVIEW).map((member) => (
            <MemberRow key={member.userId} member={member} online inVoice={presence.inVoice.has(member.userId)} />
          ))}
        </ul>
      </CardContent>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-80 gap-0 overflow-y-auto p-0">
          <SheetHeader>
            <SheetTitle>{t("members")}</SheetTitle>
          </SheetHeader>
          <MemberList community={community} />
        </SheetContent>
      </Sheet>
    </Card>
  );
}

/** Online first, then offline. The viewer, and anyone talking in voice, counts as online between presence refreshes. */
function usePresence(community: CommunityDetail) {
  const { user } = useSession();
  const rooms = useVoiceState().rooms;
  const inVoice = new Set(community.channels.flatMap((channel) => rooms[channel.id]?.participants.map((p) => p.userId) ?? []));
  const isOnline = (member: CommunityMember) => member.online || member.userId === user?.id || inVoice.has(member.userId);
  return { inVoice, isOnline };
}

function MemberList({ community }: { community: CommunityDetail }) {
  const { t } = useCommunityMessages();
  const { inVoice, isOnline } = usePresence(community);
  const groups = [
    { label: t("online"), members: community.members.filter(isOnline) },
    { label: t("offline"), members: community.members.filter((member) => !isOnline(member)) },
  ].filter((group) => group.members.length > 0);

  return (
    <div className="flex flex-col gap-4 px-2 pb-4">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label} className="flex flex-col gap-1">
          <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase">
            {t("groupCount", { label: group.label, count: group.members.length })}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {group.members.map((member) => (
              <MemberRow key={member.userId} member={member} online={isOnline(member)} inVoice={inVoice.has(member.userId)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MemberRow({ member, online, inVoice }: { member: CommunityMember; online: boolean; inVoice: boolean }) {
  const { t } = useCommunityMessages();
  return (
    <li>
      <Link
        href={`/players/${member.userId}`}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          !online && "opacity-55 hover:opacity-100",
        )}
      >
        <span className="relative shrink-0">
          <UserAvatar name={member.displayName} imageKey={member.avatarKey} className="size-8" />
          {online && <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-success ring-2 ring-card" aria-hidden />}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{member.displayName}</span>
        {member.role === "owner" && <Crown className="size-3.5 shrink-0 text-warning" aria-label={t("owner")} />}
        {inVoice && <Volume2 className="size-4 shrink-0 text-success" aria-label={t("inVoice")} />}
      </Link>
    </li>
  );
}

export function LeaveDialog({ community, open, onOpenChange }: { community: CommunityDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useCommunityMessages();
  const router = useRouter();
  const leave = useLeaveCommunity(community.id);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("leaveTitle", { name: community.name })}</AlertDialogTitle>
          <AlertDialogDescription>{t("leaveHint")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              leave.mutate(undefined, {
                onSuccess: () => router.push("/communities"),
                onError: (error) => toast.error(error.message),
              })
            }
          >
            {t("leave")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AddChannelDialog({ community, kind, onClose }: { community: CommunityDetail; kind: Kind; onClose: () => void }) {
  const { t } = useCommunityMessages();
  const add = useAddChannel(community.id);
  const [name, setName] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    add.mutate({ name: name.trim(), kind }, { onSuccess: onClose, onError: (error) => toast.error(error.message) });
  };
  const Icon = kind === "text" ? Hash : Volume2;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{kind === "text" ? t("addTextChannel") : t("addVoiceChannel")}</DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="channel-name">{t("channelName")}</FieldLabel>
            <div className="relative">
              <Icon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="channel-name"
                value={name}
                maxLength={32}
                autoFocus
                placeholder={kind === "text" ? t("textChannelPlaceholder") : t("voiceChannelPlaceholder")}
                onChange={(event) => setName(event.target.value)}
                className="pl-8"
              />
            </div>
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={add.isPending || !name.trim()}>
              {add.isPending && <Loader2 className="animate-spin" />} {t("addChannel")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
