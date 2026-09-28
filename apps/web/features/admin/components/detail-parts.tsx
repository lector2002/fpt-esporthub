"use client";

import Link from "next/link";
import { Flag, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/common/query-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAdminDetailMessages } from "../detail-messages";
import type { DetailReport, Person } from "../detail-types";
import { REPORT_STATUS_TONE, formatDate } from "../format";
import { useAdminMessages } from "../messages";
import { useReasonLabel } from "./report-sheet";

/** Top of a detail page: picture, name with badges, a few muted lines, actions on the right. */
export function DetailHeader({ avatar, title, badges, lines, actions }: { avatar: React.ReactNode; title: string; badges?: React.ReactNode; lines: React.ReactNode[]; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {avatar}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
          <span className="min-w-0 break-words">{title}</span>
          {badges}
        </h1>
        {lines.map((line, index) => (
          <p key={index} className="truncate text-sm text-muted-foreground">
            {line}
          </p>
        ))}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 max-sm:basis-full">{actions}</div>}
    </div>
  );
}

export const KPI_GRID = "grid grid-cols-2 gap-3 xl:grid-cols-4";

/** A titled card holding a list, with an empty state and an optional "latest N" note. */
export function ListCard({ title, empty, emptyIcon, isEmpty, note, children }: { title: string; empty: string; emptyIcon: LucideIcon; isEmpty: boolean; note?: string | null; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {note && <CardAction className="text-xs text-muted-foreground">{note}</CardAction>}
      </CardHeader>
      <CardContent>{isEmpty ? <EmptyState icon={emptyIcon} title={empty} /> : children}</CardContent>
    </Card>
  );
}

/** Avatar and name, linking to the person's admin page. */
export function PersonLink({ person, className }: { person: Person; className?: string }) {
  return (
    <Link href={`/admin/users/${person.id}`} className={cn("inline-flex min-w-0 items-center gap-2 font-medium hover:underline", className)}>
      <UserAvatar name={person.displayName} imageKey={person.avatarKey} className="size-7" />
      <span className="truncate">{person.displayName}</span>
    </Link>
  );
}

/** Label / value pairs; empty values show "None". */
export function FieldList({ fields }: { fields: { label: string; value: React.ReactNode }[] }) {
  const { t } = useAdminDetailMessages();
  return (
    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
      {fields.map(({ label, value }) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words">{value === "" || value === null || value === undefined ? t("none") : value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ReportsCard({ title, reports, listLimit }: { title: string; reports: DetailReport[]; listLimit: number }) {
  const { t, language } = useAdminMessages();
  const detail = useAdminDetailMessages().t;
  const reasonLabel = useReasonLabel();
  return (
    <ListCard
      title={title}
      empty={detail("noReports")}
      emptyIcon={Flag}
      isEmpty={reports.length === 0}
      note={reports.length >= listLimit ? detail("latestOnly", { count: listLimit }) : null}
    >
      <ul className="flex flex-col gap-3">
        {reports.map((report) => (
          <li key={report.id} className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline" className={REPORT_STATUS_TONE[report.status]}>
              {t(`reportStatus_${report.status}`)}
            </Badge>
            <span className="font-medium">{reasonLabel(report.reason)}</span>
            <PersonLink person={report.reporter} className="text-muted-foreground" />
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{formatDate(report.createdAt, language)}</span>
          </li>
        ))}
      </ul>
      <Link href="/admin/reports" className="mt-3 inline-block text-sm text-primary hover:underline">
        {t("tabReports")}
      </Link>
    </ListCard>
  );
}
