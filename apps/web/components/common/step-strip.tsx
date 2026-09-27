import type { LucideIcon } from "lucide-react";
import { CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** A short numbered "how it works" row; steps before `current` show as done. */
export function StepStrip({ steps, current }: { steps: { icon: LucideIcon; label: string }[]; current: number }) {
  return (
    <ol className={cn("grid gap-3", steps.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3")}>
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const Icon = done ? CircleCheck : step.icon;
        return (
          <li
            key={step.label}
            aria-current={active ? "step" : undefined}
            className={cn("flex items-center gap-3 rounded-xl p-3 ring-1 ring-foreground/10", active && "bg-primary/10 ring-primary/40")}
          >
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-lg bg-muted",
                active && "bg-primary text-primary-foreground",
                done && "bg-success/15 text-success",
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <span className={cn("text-sm font-medium", !active && !done && "text-muted-foreground")}>
              <span className="text-muted-foreground tabular-nums">{index + 1}. </span>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
