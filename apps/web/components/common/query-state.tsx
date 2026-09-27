"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { AlertCircle, Inbox, RotateCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { defineMessages } from "@/lib/i18n";

const useMessages = defineMessages({
  vi: { errorTitle: "Không tải được dữ liệu", retry: "Thử lại" },
  en: { errorTitle: "Couldn't load data", retry: "Retry" },
});

export function ErrorState({ error, onRetry }: { error: Error | null; onRetry?: () => void }) {
  const { t } = useMessages();
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>{t("errorTitle")}</AlertTitle>
      <AlertDescription>{error?.message}</AlertDescription>
      {onRetry && (
        <AlertAction>
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCw /> {t("retry")}
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  /** A picture in place of the icon, for the main empty screens. */
  image?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, image, title, description, action }: EmptyStateProps) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        {image ? (
          <img src={image} alt="" className="mb-2 size-32 rounded-2xl object-cover" onError={(event) => { event.currentTarget.hidden = true; }} />
        ) : (
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
        )}
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

/** Default loading placeholder: a few stacked card-height bars. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  );
}

/**
 * Renders the loading, error and empty states of a query, then `children(data)`.
 * Every data-backed screen goes through this so no screen invents fallback data.
 */
export function QueryState<T>({
  query,
  skeleton = <ListSkeleton />,
  isEmpty,
  empty,
  children,
}: {
  query: UseQueryResult<T>;
  skeleton?: React.ReactNode;
  isEmpty?: (data: T) => boolean;
  empty?: EmptyStateProps;
  children: (data: T) => React.ReactNode;
}) {
  if (query.isPending) return <>{skeleton}</>;
  // A failed refetch keeps the last good data on screen (polling pages on flaky Wi-Fi); the next good fetch clears it.
  if (query.isError && query.data === undefined) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const data = query.data as T;
  if (empty && isEmpty?.(data)) return <EmptyState {...empty} />;
  return <>{children(data)}</>;
}
