"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCoachingMessages } from "../messages";

interface ChipInputProps {
  id: string;
  values: string[];
  onChange: (values: string[]) => void;
  max: number;
  maxLength: number;
  placeholder?: string;
  invalid?: boolean;
  /** Quick-add chips shown until picked. */
  suggestions?: string[];
}

/** Free-text list editor: Enter or "Add" appends a trimmed, de-duplicated item. */
export function ChipInput({ id, values, onChange, max, maxLength, placeholder, invalid, suggestions = [] }: ChipInputProps) {
  const { t } = useCoachingMessages();
  const [draft, setDraft] = useState("");
  const full = values.length >= max;
  const unpicked = suggestions.filter((item) => !values.some((value) => value.toLowerCase() === item.toLowerCase()));

  function add() {
    const value = draft.trim();
    if (!value || full) return;
    if (!values.some((item) => item.toLowerCase() === value.toLowerCase())) onChange([...values, value]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={full}
          aria-invalid={invalid}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            add();
          }}
        />
        <Button type="button" variant="outline" onClick={add} disabled={full || !draft.trim()}>
          <Plus /> {t("add")}
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((item) => (
            <Badge key={item} variant="secondary" className="h-6 gap-1 pr-1">
              {item}
              <button
                type="button"
                aria-label={t("remove", { item })}
                className="rounded-sm p-0.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                onClick={() => onChange(values.filter((value) => value !== item))}
              >
                <X />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {!full && unpicked.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t("suggested")}</span>
          {unpicked.map((item) => (
            <Button key={item} type="button" size="xs" variant="outline" onClick={() => onChange([...values, item])}>
              <Plus /> {item}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
