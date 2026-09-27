import { cn } from "@/lib/utils";

/** The site logo (same drawing as app/icon.svg), in the theme's primary colors. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="64" height="64" rx="14" className="fill-primary" />
      <g fill="none" strokeLinecap="round" strokeWidth="6" className="stroke-primary-foreground">
        <circle cx="32" cy="32" r="15" />
        <path d="M32 9v11M32 44v11M9 32h11M44 32h11" />
      </g>
      <circle cx="32" cy="32" r="4.5" className="fill-primary-foreground" />
    </svg>
  );
}
