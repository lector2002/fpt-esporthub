"use client";

import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { useToggleInterest } from "../api";
import { useEventMessages } from "../messages";
import type { EventSummary } from "../types";

/** Interest on/off. Hidden for signed-out viewers and once registration has closed. */
export function InterestToggle({ event }: { event: EventSummary }) {
  const { status } = useSession();
  const { t } = useEventMessages();
  const toggle = useToggleInterest(event.id);
  if (status !== "authenticated" || !event.registrationOpen) return null;

  const next = !event.viewerInterested;
  const onClick = () =>
    toggle.mutate(next, {
      onSuccess: () => toast.success(t(next ? "interestAdded" : "interestRemoved")),
      onError: (error) => toast.error(error.message),
    });

  return (
    <Button
      variant={event.viewerInterested ? "secondary" : "outline"}
      size="sm"
      aria-pressed={event.viewerInterested}
      disabled={toggle.isPending}
      onClick={onClick}
    >
      <Star className={event.viewerInterested ? "fill-current text-primary" : undefined} />
      {event.viewerInterested ? t("interested") : t("markInterested")}
    </Button>
  );
}
