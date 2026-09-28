"use client";

import { useState } from "react";
import { Check, Store, X } from "lucide-react";
import { toast } from "sonner";
import { ABOVE_CARD_LINK } from "@/components/common/card-link";
import { QueryState } from "@/components/common/query-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAdminVenues, useReviewVenue } from "@/features/offline-tournaments/api";
import { useOfflineMessages } from "@/features/offline-tournaments/messages";
import type { AdminVenue, VenueStatus } from "@/features/offline-tournaments/types";
import { useAdminDetailMessages } from "../detail-messages";
import { STACK_ON_PHONE, formatDate } from "../format";
import { LINKED_ROW, RowLink } from "./linked-row";

const FILTERS: (VenueStatus | "ALL")[] = ["PENDING", "APPROVED", "REJECTED", "ALL"];

export function VenuesTab() {
  const { t, language } = useOfflineMessages();
  const detail = useAdminDetailMessages().t;
  const [filter, setFilter] = useState<VenueStatus | "ALL">("PENDING");
  const venues = useAdminVenues(filter === "ALL" ? null : filter);
  const review = useReviewVenue();
  const [rejecting, setRejecting] = useState<AdminVenue | null>(null);
  const [note, setNote] = useState("");

  const send = (venue: AdminVenue, status: "APPROVED" | "REJECTED", reviewNote?: string) =>
    review.mutate(
      { id: venue.id, status, note: reviewNote || undefined },
      {
        onSuccess: () => {
          toast.success(t("venueReviewed"));
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
        onValueChange={(value) => value && setFilter(value as VenueStatus | "ALL")}
        className="flex-wrap self-start"
      >
        {FILTERS.map((value) => (
          <ToggleGroupItem key={value} value={value} className="data-[state=on]:text-primary">
            {value === "ALL" ? t("adminFilterAll") : t(`venue_${value}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <QueryState query={venues} isEmpty={(list) => list.length === 0} empty={{ icon: Store, title: t("adminNoVenues") }}>
        {(list) => (
          <Table className={STACK_ON_PHONE}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colVenue")}</TableHead>
                <TableHead>{t("colOwner")}</TableHead>
                <TableHead>{t("colPcs")}</TableHead>
                <TableHead>{t("colTournaments")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((venue) => (
                <TableRow key={venue.id} className={LINKED_ROW}>
                  <TableCell className="whitespace-normal">
                    <p className="font-medium">
                      <RowLink href={`/admin/venues/${venue.id}`} label={detail("openVenue", { name: venue.name })}>
                        {venue.name}
                      </RowLink>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {venue.address}, {venue.city}
                      {venue.phone ? ` · ${venue.phone}` : ""}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <p>{venue.owner.displayName}</p>
                    <p className="text-xs text-muted-foreground">{venue.owner.email}</p>
                  </TableCell>
                  <TableCell className="tabular-nums">{venue.pcCount}</TableCell>
                  <TableCell className="tabular-nums">{venue._count.tournaments}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(`venue_${venue.status}`)}</Badge>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(venue.createdAt, language)}</p>
                  </TableCell>
                  <TableCell>
                    <div className={`${ABOVE_CARD_LINK} flex justify-end gap-2`}>
                      {venue.status !== "APPROVED" && (
                        <Button size="sm" onClick={() => send(venue, "APPROVED")} disabled={review.isPending}>
                          <Check /> {t("approve")}
                        </Button>
                      )}
                      {venue.status !== "REJECTED" && (
                        <Button size="sm" variant="outline" onClick={() => setRejecting(venue)} disabled={review.isPending}>
                          <X /> {t("reject")}
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
            <DialogTitle>{t("rejectTitle", { venue: rejecting?.name ?? "" })}</DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="venue-reject-note">{t("rejectNote")}</FieldLabel>
            <Textarea id="venue-reject-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={() => rejecting && send(rejecting, "REJECTED", note.trim())} disabled={review.isPending}>
              {t("reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
