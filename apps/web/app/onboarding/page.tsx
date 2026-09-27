import { Suspense } from "react";
import { OnboardingWizard } from "@/features/onboarding/components/onboarding-wizard";

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingWizard />
    </Suspense>
  );
}
