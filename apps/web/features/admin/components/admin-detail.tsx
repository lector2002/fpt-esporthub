"use client";

import Link from "next/link";
import type { UseQueryResult } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { EmptyState, QueryState, type EmptyStateProps } from "@/components/common/query-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";

/** Frame of every admin detail page: back link, a 404 state, then the loaded body. */
export function AdminDetail<T>({
  query,
  backHref,
  backLabel,
  notFound,
  children,
}: {
  query: UseQueryResult<T>;
  backHref: string;
  backLabel: string;
  notFound: EmptyStateProps;
  children: (data: T) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href={backHref}>
          <ArrowLeft /> {backLabel}
        </Link>
      </Button>
      {query.error instanceof ApiError && query.error.status === 404 ? (
        <EmptyState {...notFound} />
      ) : (
        <QueryState
          query={query}
          skeleton={
            <div className="flex flex-col gap-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-64" />
            </div>
          }
        >
          {children}
        </QueryState>
      )}
    </div>
  );
}
