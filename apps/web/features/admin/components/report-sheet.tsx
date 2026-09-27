"use client";

import { useState } from "react";
import { CheckCircle2, Eye, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ReputationBadge } from "@/components/common/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { REPORT_REASONS } from "@/features/safety/types";
import { useUpdateReport } from "../api";
import { REPORT_STATUS_TONE, USER_STATUS_TONE, formatDate } from "../format";
import { useAdminMessages } from "../messages";
import { REPORT_ACTIONS, type AdminReport, type ReportAction, type ReportStatus } from "../types";

/** Known reasons are translated; older free-text reasons are shown as stored. */
export function useReasonLabel() {
  const { t } = useAdminMessages();
  return (reason: string) =>
    (REPORT_REASONS as readonly string[]).includes(reason)
      ? t(`reason_${reason as (typeof REPORT_REASONS)[number]}`)
      : reason;
}

export function ReportSheet({ report, onClose }: { report: AdminReport | null; onClose: () => void }) {
  return (
    <Sheet open={report !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {report && <ReportDetails key={report.id} report={report} onDone={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function ReportDetails({ report, onDone }: { report: AdminReport; onDone: () => void }) {
  const { t, language } = useAdminMessages();
  const reasonLabel = useReasonLabel();
  const update = useUpdateReport();
  const [action, setAction] = useState<ReportAction>("none");
  const [submitting, setSubmitting] = useState<ReportStatus | null>(null);

  const submit = (status: Exclude<ReportStatus, "PENDING">) => {
    setSubmitting(status);
    update.mutate(
      { reportId: report.id, status, action: status === "RESOLVED" ? action : "none" },
      {
        onSuccess: () => {
          toast.success(t("reportUpdated"));
          onDone();
        },
        onError: (error) => toast.error(t("updateFailed"), { description: error.message }),
        onSettled: () => setSubmitting(null),
      },
    );
  };

  const reported = report.reportedUser;

  return (
    <>
      <SheetHeader>
        <SheetTitle>{t("reportDetails")}</SheetTitle>
        <SheetDescription>{formatDate(report.createdAt, language, true)}</SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-4 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{reasonLabel(report.reason)}</Badge>
          <Badge variant="outline" className={cn(REPORT_STATUS_TONE[report.status])}>
            {t(`reportStatus_${report.status}`)}
          </Badge>
        </div>
        <DetailRow label={t("details")}>
          <p className="break-words whitespace-pre-wrap">{report.details ?? t("noDetails")}</p>
        </DetailRow>
        <DetailRow label={`${t("target")}: ${t(`target_${report.targetType}`)}`}>
          <p className="rounded-md border border-border bg-muted/40 p-2 break-words whitespace-pre-wrap">
            {report.targetPreview?.label ?? t("targetDeleted")}
          </p>
        </DetailRow>
        <Separator />
        <DetailRow label={t("reporter")}>{report.reporter.displayName}</DetailRow>
        {reported && (
          <DetailRow label={t("reportedUser")}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{reported.displayName}</span>
              <Badge variant="outline" className={USER_STATUS_TONE[reported.status]}>
                {t(`status_${reported.status}`)}
              </Badge>
              <ReputationBadge badge={reported.reputationBadge} showNew />
            </div>
          </DetailRow>
        )}
        {reported && (
          <Field>
            <FieldLabel htmlFor="report-action">{t("action")}</FieldLabel>
            <Select value={action} onValueChange={(value) => setAction(value as ReportAction)}>
              <SelectTrigger id="report-action" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_ACTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`action_${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>

      <SheetFooter>
        <Button onClick={() => submit("RESOLVED")} disabled={update.isPending}>
          {submitting === "RESOLVED" ? <Spinner /> : <CheckCircle2 />} {t("resolve")}
        </Button>
        {report.status !== "REVIEWING" && (
          <Button variant="outline" onClick={() => submit("REVIEWING")} disabled={update.isPending}>
            {submitting === "REVIEWING" ? <Spinner /> : <Eye />} {t("markReviewing")}
          </Button>
        )}
        {report.status !== "DISMISSED" && (
          <Button variant="ghost" onClick={() => submit("DISMISSED")} disabled={update.isPending}>
            {submitting === "DISMISSED" ? <Spinner /> : <XCircle />} {t("dismiss")}
          </Button>
        )}
      </SheetFooter>
    </>
  );
}
