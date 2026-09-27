import { cn } from "@/lib/utils";

/** Small numeric badge for unread / pending counts. Renders nothing for 0. */
export function CountBadge({ count, label, className }: { count: number; label?: string; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[0.7rem] font-semibold text-primary-foreground",
        className,
      )}
      aria-label={label}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
