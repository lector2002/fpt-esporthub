"use client";

import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { LookupOption } from "../types";

/** Multi-select chips. `max` stops new picks once reached (deselecting still works). */
export function ChipsField({
  legend,
  hint,
  options,
  value,
  onChange,
  error,
  max,
}: {
  legend: string;
  hint?: string;
  options: LookupOption[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  max?: number;
}) {
  const change = (next: string[]) => {
    if (max !== undefined && next.length > max) return;
    onChange(next);
  };
  return (
    <FieldSet data-invalid={Boolean(error)}>
      <FieldLegend variant="label">
        {legend} {hint && <span className="font-normal text-muted-foreground">({hint})</span>}
      </FieldLegend>
      <ToggleGroup type="multiple" variant="outline" size="sm" value={value} onValueChange={change} className="flex-wrap">
        {options.map((option) => (
          <ToggleGroupItem key={option.id} value={option.id} className="data-[state=on]:text-primary">
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {error && <FieldError>{error}</FieldError>}
    </FieldSet>
  );
}

export function SelectField({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: LookupOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full" aria-invalid={Boolean(error)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
