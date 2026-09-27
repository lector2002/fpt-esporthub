"use client";

import { Check } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface Choice {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

const ITEM_CLASS =
  "h-auto min-h-10 justify-between gap-2 whitespace-normal px-3 py-2 text-left data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground";

function ChoiceItem({ choice }: { choice: Choice }) {
  return (
    <ToggleGroupItem value={choice.value} disabled={choice.disabled} className={ITEM_CLASS}>
      <span className="flex flex-col">
        <span>{choice.label}</span>
        {choice.hint && <span className="text-xs font-normal text-muted-foreground">{choice.hint}</span>}
      </span>
      <Check className="text-primary opacity-0 group-data-[state=on]/toggle:opacity-100" aria-hidden />
    </ToggleGroupItem>
  );
}

interface BaseProps {
  label: string;
  choices: Choice[];
  className?: string;
}

/** One-of-many picker rendered as selectable cards. `allowClear`: pressing the chosen card again unselects it (sends ""). */
export function SingleChoice({
  label,
  choices,
  value,
  onChange,
  allowClear = false,
  className,
}: BaseProps & { value: string; onChange: (value: string) => void; allowClear?: boolean }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label={label}
      value={value}
      onValueChange={(next) => (next || allowClear) && onChange(next)}
      className={cn("grid w-full grid-cols-2 sm:grid-cols-3", className)}
    >
      {choices.map((choice) => (
        <ChoiceItem key={choice.value} choice={choice} />
      ))}
    </ToggleGroup>
  );
}

/** Many-of-many picker; selections past `max` are ignored. */
export function MultiChoice({
  label,
  choices,
  value,
  onChange,
  max,
  className,
}: BaseProps & { value: string[]; onChange: (value: string[]) => void; max?: number }) {
  const full = max !== undefined && value.length >= max;
  return (
    <ToggleGroup
      type="multiple"
      variant="outline"
      aria-label={label}
      value={value}
      onValueChange={(next) => (max === undefined || next.length <= max) && onChange(next)}
      className={cn("grid w-full grid-cols-2 sm:grid-cols-3", className)}
    >
      {choices.map((choice) => (
        <ChoiceItem key={choice.value} choice={{ ...choice, disabled: choice.disabled || (full && !value.includes(choice.value)) }} />
      ))}
    </ToggleGroup>
  );
}
