"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { QueryState } from "@/components/common/query-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useAdminReports } from "../api";
import { REPORT_STATUS_TONE, STACK_ON_PHONE, formatDate } from "../format";
import { useAdminMessages } from "../messages";
import { REPORT_STATUSES, type AdminReport, type ReportStatus } from "../types";
import { Pagination } from "./pagination";
import { ReportSheet, useReasonLabel } from "./report-sheet";

export function ReportsTab() {
  const { t } = useAdminMessages();
  const [status, setStatus] = useState<ReportStatus>("PENDING");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reports = useAdminReports({ status, page });
  const selected = reports.data?.items.find((report) => report.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        type="single"
        variant="outline"
        value={status}
        onValueChange={(value) => {
          if (!value) return;
          setStatus(value as ReportStatus);
          setPage(1);
        }}
        className="flex-wrap"
        aria-label={t("colStatus")}
      >
        {REPORT_STATUSES.map((value) => (
          <ToggleGroupItem key={value} value={value}>
            {t(`reportStatus_${value}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <QueryState
        query={reports}
        isEmpty={(data) => data.items.length === 0}
        empty={{ icon: Flag, title: t("noReports") }}
      >
        {(data) => (
          <>
            <ReportsTable reports={data.items} onOpen={setSelectedId} />
            <Pagination page={data.page} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
          </>
        )}
      </QueryState>

      <ReportSheet report={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function ReportsTable({ reports, onOpen }: { reports: AdminReport[]; onOpen: (id: string) => void }) {
  const { t, language } = useAdminMessages();
  const reasonLabel = useReasonLabel();

  return (
    <Table className={STACK_ON_PHONE}>
      <TableHeader>
        <TableRow>
          <TableHead>{t("colReason")}</TableHead>
          <TableHead>{t("colTarget")}</TableHead>
          <TableHead>{t("colReported")}</TableHead>
          <TableHead>{t("colStatus")}</TableHead>
          <TableHead>{t("colCreated")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((report) => (
          <TableRow key={report.id} className="cursor-pointer" onClick={() => onOpen(report.id)}>
            <TableCell>
              <button
                type="button"
                className="rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(report.id);
                }}
              >
                {reasonLabel(report.reason)}
              </button>
            </TableCell>
            <TableCell className="max-w-56 truncate">
              <span className="text-muted-foreground">{t(`target_${report.targetType}`)}: </span>
              <span>{report.targetPreview?.label ?? t("targetDeleted")}</span>
            </TableCell>
            <TableCell>{report.reportedUser?.displayName ?? "-"}</TableCell>
            <TableCell>
              <Badge variant="outline" className={cn(REPORT_STATUS_TONE[report.status])}>
                {t(`reportStatus_${report.status}`)}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(report.createdAt, language)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
