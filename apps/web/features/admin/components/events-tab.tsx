"use client";

import { useState } from "react";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GameBadge } from "@/components/common/badges";
import { QueryState } from "@/components/common/query-state";
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
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDeleteTournament, useTournaments } from "../api";
import { formatDate, toSlug } from "../format";
import { useAdminMessages } from "../messages";
import type { TournamentEvent } from "../types";
import { EventFormDialog } from "./event-form-dialog";

type When = "upcoming" | "past";

export function EventsTab() {
  const { t } = useAdminMessages();
  const [when, setWhen] = useState<When>("upcoming");
  const [editing, setEditing] = useState<TournamentEvent | "new" | null>(null);
  const [deleting, setDeleting] = useState<TournamentEvent | null>(null);
  const events = useTournaments(when);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ToggleGroup
          type="single"
          variant="outline"
          value={when}
          onValueChange={(value) => value && setWhen(value as When)}
          aria-label={t("tabEvents")}
        >
          <ToggleGroupItem value="upcoming">{t("upcoming")}</ToggleGroupItem>
          <ToggleGroupItem value="past">{t("past")}</ToggleGroupItem>
        </ToggleGroup>
        <Button onClick={() => setEditing("new")}>
          <Plus /> {t("createEvent")}
        </Button>
      </div>

      <QueryState
        query={events}
        isEmpty={(data) => data.length === 0}
        empty={{ icon: CalendarDays, title: t("noEvents") }}
      >
        {(data) => (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {data.map((event) => (
              <EventRow key={event.id} event={event} onEdit={() => setEditing(event)} onDelete={() => setDeleting(event)} />
            ))}
          </ul>
        )}
      </QueryState>

      <EventFormDialog
        event={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
      <DeleteEventDialog event={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function EventRow({ event, onEdit, onDelete }: { event: TournamentEvent; onEdit: () => void; onDelete: () => void }) {
  const { t, language } = useAdminMessages();
  return (
    <li className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <GameBadge game={toSlug(event.game)} />
          <p className="truncate font-medium">{event.title}</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {event.organizer} · {t("starts", { date: formatDate(event.startsAt, language, true) })} ·{" "}
          {t("deadline", { date: formatDate(event.deadlineAt, language, true) })}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil /> {t("edit")}
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 /> {t("delete")}
        </Button>
      </div>
    </li>
  );
}

function DeleteEventDialog({ event, onClose }: { event: TournamentEvent | null; onClose: () => void }) {
  const { t } = useAdminMessages();
  const remove = useDeleteTournament();

  const onConfirm = (clickEvent: React.MouseEvent) => {
    clickEvent.preventDefault();
    if (!event) return;
    remove.mutate(event.id, {
      onSuccess: () => {
        toast.success(t("eventDeleted"));
        onClose();
      },
      onError: (error) => toast.error(t("updateFailed"), { description: error.message }),
    });
  };

  return (
    <AlertDialog open={event !== null} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteEventTitle", { title: event?.title ?? "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("deleteEventDescription")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={remove.isPending} onClick={onConfirm}>
            {remove.isPending && <Spinner />} {t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
