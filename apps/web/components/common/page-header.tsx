import { cn } from "@/lib/utils";

/** `image` puts the header on a banner picture that fades into the page from the left, where the title sits. */
export function PageHeader({ title, description, actions, image }: { title: string; description?: string; actions?: React.ReactNode; image?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", image && "relative isolate min-h-36 overflow-hidden rounded-xl p-5 ring-1 ring-foreground/10 sm:min-h-44 sm:p-6")}>
      {image && (
        <>
          <img src={image} alt="" className="absolute inset-0 -z-10 size-full object-cover object-right" onError={(event) => { event.currentTarget.hidden = true; }} />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/75 to-background/10" aria-hidden />
        </>
      )}
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && (
        <div className={cn("flex flex-wrap items-center gap-2", image && "on-picture rounded-xl bg-background/90 p-1.5 ring-1 ring-foreground/10 shadow-lg")}>{actions}</div>
      )}
    </div>
  );
}
