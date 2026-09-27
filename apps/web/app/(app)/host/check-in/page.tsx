import { Suspense } from "react";
import { CheckInPage } from "@/features/offline-tournaments/components/check-in-page";

export default function Page() {
  return (
    <Suspense>
      <CheckInPage />
    </Suspense>
  );
}
