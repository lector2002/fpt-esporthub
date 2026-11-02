"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAdminMessages } from "../messages";
import { FINANCE_PERIODS, type FinancePeriod } from "../types";

export function PeriodToggle({ value, onChange }: { value: FinancePeriod; onChange: (days: FinancePeriod) => void }) {
  const { t } = useAdminMessages();
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={String(value)}
      onValueChange={(next) => next && onChange(Number(next) as FinancePeriod)}
      aria-label={t("period")}
    >
      {FINANCE_PERIODS.map((period) => (
        <ToggleGroupItem key={period} value={String(period)} className="data-[state=on]:text-primary">
          {t("periodDays", { days: period })}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
