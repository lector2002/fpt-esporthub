import { Suspense } from "react";
import { ListSkeleton } from "@/components/common/query-state";
import { WalletPage } from "@/features/credits/components/wallet-page";

export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton rows={3} />}>
      <WalletPage />
    </Suspense>
  );
}
