"use client";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/** Anchored card on /profile/me. `id` is the hash target used by dashboard links. */
export function ProfileSection({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-24">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Multi-select chips with an optional cap; unselected chips disable once the cap is reached. */
export function ChipSelect({
  label,
  options,
  value,
  onChange,
  max,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  const full = max !== undefined && value.length >= max;
  return (
    <ToggleGroup
      type="multiple"
      variant="outline"
      size="sm"
      aria-label={label}
      className="flex-wrap"
      value={value}
      onValueChange={(next) => (max === undefined || next.length <= max) && onChange(next)}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.id}
          value={option.id}
          disabled={full && !value.includes(option.id)}
          className="data-[state=on]:border-primary data-[state=on]:text-primary"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
