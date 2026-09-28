import { Suspense } from "react";
import { ListSkeleton } from "@/components/common/query-state";
import { MyProfileScreen } from "@/features/profile/components/my-profile-screen";

export default function MyProfilePage() {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <MyProfileScreen />
    </Suspense>
  );
}
