import { cn } from "@/lib/utils";

/** Titled block inside a wizard step. `aside` renders right of the title (e.g. a counter). */
export function StepSection({
  title,
  description,
  aside,
  className,
  children,
}: {
  title: string;
  description?: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {aside && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{aside}</span>}
      </div>
      {children}
    </section>
  );
}
