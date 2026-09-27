import { Suspense } from "react";
import { ListSkeleton } from "@/components/common/query-state";
import { EventsPage } from "@/features/events/components/events-page";

export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton rows={3} />}>
      <EventsPage />
    </Suspense>
  );
}
