"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import type { GameSlug } from "@/lib/contracts";
import { useMainOptions, type MainOption } from "../api";
import { useQuestionnaireMessages } from "../messages";
import { MAX_MAINS } from "../options";

export function MainIcon({ option }: { option: MainOption }) {
  if (!option.imageUrl) return null;
  return <img src={option.imageUrl} alt="" width={24} height={24} className="size-6 shrink-0 rounded" />;
}

/** Searchable champion/agent list; up to MAX_MAINS picks, shown as removable chips. */
export function MainsPicker({ game, value, onChange }: { game: GameSlug; value: string[]; onChange: (value: string[]) => void }) {
  const { t } = useQuestionnaireMessages();
  const options = useMainOptions(game);
  if (options.isPending) return <Skeleton className="h-56 w-full" />;
  if (options.isError) return <p className="text-sm text-muted-foreground">{t("mainsUnavailable")}</p>;

  const byId = new Map(options.data.map((option) => [option.id, option]));
  const full = value.length >= MAX_MAINS;
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((item) => item !== id) : full ? value : [...value, id]);

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((id) => {
            const option = byId.get(id) ?? { id, label: id, imageUrl: null };
            return (
              <li key={id} className="flex items-center gap-1.5 rounded-md border border-border py-1 pr-1 pl-1.5 text-sm">
                <MainIcon option={option} />
                {option.label}
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t("remove", { name: option.label })} onClick={() => toggle(id)}>
                  <X />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <Command className="rounded-lg border border-border">
        <CommandInput placeholder={t("mainsSearch")} />
        <CommandList className="max-h-48">
          <CommandEmpty>{t("mainsEmpty")}</CommandEmpty>
          {options.data.map((option) => {
            const selected = value.includes(option.id);
            return (
              <CommandItem
                key={option.id}
                value={`${option.label} ${option.id}`}
                disabled={full && !selected}
                onSelect={() => toggle(option.id)}
              >
                <MainIcon option={option} />
                <span className="flex-1">{option.label}</span>
                {selected && <Check className="text-primary" />}
              </CommandItem>
            );
          })}
        </CommandList>
      </Command>
    </div>
  );
}
