"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEventMessages } from "../messages";
import type { EventSummary } from "../types";

/** The organizer's sign-up page, while registration is open. The API only stores http(s) links. */
export function RegisterLink({ event, size = "sm" }: { event: EventSummary; size?: "sm" | "default" }) {
  const { t } = useEventMessages();
  if (!event.registrationOpen || !event.registrationUrl || !/^https?:\/\//i.test(event.registrationUrl)) return null;
  return (
    <Button asChild size={size}>
      <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer">
        {t("register")} <ExternalLink />
      </a>
    </Button>
  );
}
