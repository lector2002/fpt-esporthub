"use client";

import { useState } from "react";
import { Check, GraduationCap, X } from "lucide-react";
import { toast } from "sonner";
import { ABOVE_CARD_LINK } from "@/components/common/card-link";
import { GameBadge } from "@/components/common/badges";
import { QueryState } from "@/components/common/query-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatVnd } from "@/features/offline-tournaments/format";
import { gameSlug } from "@/lib/contracts";
import { useAdminCoaches, useReviewCoach, type AdminCoach, type CoachReviewStatus } from "../api";
import { useAdminDetailMessages } from "../detail-messages";
import { STACK_ON_PHONE, formatDate } from "../format";
import { useAdminMessages } from "../messages";
import { LINKED_ROW, RowLink } from "./linked-row";

const FILTERS: (CoachReviewStatus | "ALL")[] = ["PENDING", "APPROVED", "REJECTED", "ALL"];

/** Coach listings stay hidden from players until approved here. */
export function CoachesTab() {
  const { t, language } = useAdminMessages();
  const detail = useAdminDetailMessages().t;
  const [filter, setFilter] = useState<CoachReviewStatus | "ALL">("PENDING");
  const coaches = useAdminCoaches(filter === "ALL" ? null : filter);
  const review = useReviewCoach();
  const [rejecting, setRejecting] = useState<AdminCoach | null>(null);
  const [note, setNote] = useState("");

  const send = (coach: AdminCoach, status: "APPROVED" | "REJECTED", reviewNote?: string) =>
    review.mutate(
      { id: coach.id, status, note: reviewNote || undefined },
      {
        onSuccess: () => {
          toast.success(t("coachReviewed"));
          setRejecting(null);
          setNote("");
        },
        onError: (error) => toast.error(error.message),
      },
    );

  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={filter}
        onValueChange={(value) => value && setFilter(value as CoachReviewStatus | "ALL")}
        className="flex-wrap self-start"
      >
        {FILTERS.map((value) => (
          <ToggleGroupItem key={value} value={value} className="data-[state=on]:text-primary">
            {value === "ALL" ? t("coachFilterAll") : t(`coachStatus_${value}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <QueryState query={coaches} isEmpty={(list) => list.length === 0} empty={{ icon: GraduationCap, title: t("noCoaches") }}>
        {(list) => (
          <Table className={STACK_ON_PHONE}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colCoach")}</TableHead>
                <TableHead>{t("colRate")}</TableHead>
                <TableHead>{t("colReviewStatus")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((coach) => (
                <TableRow key={coach.id} className={LINKED_ROW}>
                  <TableCell className="max-w-md whitespace-normal">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        <RowLink href={`/admin/coaches/${coach.id}`} label={detail("openCoach", { name: coach.user.displayName })}>
                          {coach.user.displayName}
                        </RowLink>
                      </span>
                      <GameBadge game={gameSlug(coach.game)} />
                    </div>
                    <p className="text-xs text-muted-foreground">{coach.user.email}</p>
                    <p className="mt-1 text-sm">{coach.specialties.join(", ")}</p>
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{coach.bio}</p>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatVnd(coach.hourlyRate, language)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(`coachStatus_${coach.reviewStatus}`)}</Badge>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(coach.createdAt, language)}</p>
                  </TableCell>
                  <TableCell>
                    <div className={`${ABOVE_CARD_LINK} flex justify-end gap-2`}>
                      {coach.reviewStatus !== "APPROVED" && (
                        <Button size="sm" onClick={() => send(coach, "APPROVED")} disabled={review.isPending}>
                          <Check /> {t("approveCoach")}
                        </Button>
                      )}
                      {coach.reviewStatus !== "REJECTED" && (
                        <Button size="sm" variant="outline" onClick={() => setRejecting(coach)} disabled={review.isPending}>
                          <X /> {t("rejectCoach")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </QueryState>
      <Dialog open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rejectCoachTitle", { name: rejecting?.user.displayName ?? "" })}</DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="coach-reject-note">{t("rejectCoachNote")}</FieldLabel>
            <Textarea id="coach-reject-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              {t("cancelReview")}
            </Button>
            <Button variant="destructive" onClick={() => rejecting && send(rejecting, "REJECTED", note.trim())} disabled={review.isPending}>
              {t("rejectCoach")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
