import { Suspense } from "react";
import { ListSkeleton } from "@/components/common/query-state";
import { MockCheckout } from "@/features/credits/components/mock-checkout";

export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton rows={2} />}>
      <MockCheckout />
    </Suspense>
  );
}
