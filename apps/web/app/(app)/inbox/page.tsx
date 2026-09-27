import { Suspense } from "react";
import { ListSkeleton } from "@/components/common/query-state";
import { InboxView } from "@/features/chat/components/inbox-view";

export default function InboxPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <InboxView />
    </Suspense>
  );
}
