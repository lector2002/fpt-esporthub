import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder for the whole shell while the session loads or a redirect is pending. */
export function ShellSkeleton() {
  return (
    <div className="flex min-h-svh w-full bg-background" aria-busy="true">
      <aside className="hidden w-64 shrink-0 flex-col gap-2 border-r border-border bg-sidebar p-2 md:flex">
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
        <Skeleton className="mt-auto h-12 w-full" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-border px-4 md:px-6">
          <Skeleton className="size-8 md:hidden" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="ml-auto size-8 rounded-full" />
        </div>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 h-14 border-t border-border bg-sidebar md:hidden" />
    </div>
  );
}
