"use client";

import Link from "next/link";
import { GameBadge } from "@/components/common/badges";
import { ABOVE_CARD_LINK, CARD_HOVER, CardLink } from "@/components/common/card-link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEventMessages } from "../messages";
import type { EventSummary } from "../types";
import { EventMeta } from "./event-meta";
import { InterestToggle } from "./interest-toggle";
import { RegisterLink } from "./register-link";

export function EventCard({ event }: { event: EventSummary }) {
  const { t } = useEventMessages();
  return (
    <Card size="sm" className={cn("h-full", CARD_HOVER)}>
      <img src={`/images/event-${event.game}.webp`} alt="" loading="lazy" className="aspect-[3/1] w-full object-cover" />
      <CardLink href={`/events/${event.id}`} />
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0">
            <Link href={`/events/${event.id}`} className="hover:text-primary focus-visible:underline">
              {event.title}
            </Link>
          </CardTitle>
          <GameBadge game={event.game} />
        </div>
        <CardDescription>
          {t("organizer")}: {event.organizer}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <EventMeta event={event} />
      </CardContent>
      <CardFooter className={cn("flex-wrap justify-end gap-2 border-t py-3 empty:hidden", ABOVE_CARD_LINK)}>
        <InterestToggle event={event} />
        <RegisterLink event={event} />
      </CardFooter>
    </Card>
  );
}
