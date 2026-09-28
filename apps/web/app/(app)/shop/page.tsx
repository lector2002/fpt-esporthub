import { Suspense } from "react";
import { ListSkeleton } from "@/components/common/query-state";
import { ShopScreen } from "@/features/cosmetics/components/shop-screen";

export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <ShopScreen />
    </Suspense>
  );
}
