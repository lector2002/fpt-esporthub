"use client";

import { useState } from "react";
import { CheckCircle2, Eye, MessageSquareText, XCircle } from "lucide-react";
import { toast } from "sonner";
import { QueryState } from "@/components/common/query-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useAdminFeedback, useUpdateFeedback } from "../api";
import { REPORT_STATUS_TONE, STACK_ON_PHONE, formatDate } from "../format";
import { useAdminMessages } from "../messages";
import { REPORT_STATUSES, type AdminFeedback, type ReportStatus } from "../types";
import { Pagination } from "./pagination";

export function FeedbackTab() {
  const { t } = useAdminMessages();
  const [status, setStatus] = useState<ReportStatus>("PENDING");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const feedback = useAdminFeedback({ status, page });
  const selected = feedback.data?.items.find((item) => item.id === selectedId) ?? null;

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

      <QueryState query={feedback} isEmpty={(data) => data.items.length === 0} empty={{ icon: MessageSquareText, title: t("noFeedback") }}>
        {(data) => (
          <>
            <FeedbackTable items={data.items} onOpen={setSelectedId} />
            <Pagination page={data.page} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
          </>
        )}
      </QueryState>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selected && <FeedbackDetails key={selected.id} item={selected} onDone={() => setSelectedId(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FeedbackTable({ items, onOpen }: { items: AdminFeedback[]; onOpen: (id: string) => void }) {
  const { t, language } = useAdminMessages();
  return (
    <Table className={STACK_ON_PHONE}>
      <TableHeader>
        <TableRow>
          <TableHead>{t("colKind")}</TableHead>
          <TableHead>{t("colMessage")}</TableHead>
          <TableHead>{t("colSender")}</TableHead>
          <TableHead>{t("colStatus")}</TableHead>
          <TableHead>{t("colCreated")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id} className="cursor-pointer" onClick={() => onOpen(item.id)}>
            <TableCell>
              <button
                type="button"
                className="rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(item.id);
                }}
              >
                {t(`feedbackKind_${item.kind}`)}
              </button>
            </TableCell>
            <TableCell className="max-w-72 truncate">{item.message}</TableCell>
            <TableCell>{item.user.displayName}</TableCell>
            <TableCell>
              <Badge variant="outline" className={cn(REPORT_STATUS_TONE[item.status])}>
                {t(`reportStatus_${item.status}`)}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(item.createdAt, language)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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

function FeedbackDetails({ item, onDone }: { item: AdminFeedback; onDone: () => void }) {
  const { t, language } = useAdminMessages();
  const update = useUpdateFeedback();
  const [submitting, setSubmitting] = useState<ReportStatus | null>(null);

  const submit = (status: Exclude<ReportStatus, "PENDING">) => {
    setSubmitting(status);
    update.mutate(
      { feedbackId: item.id, status },
      {
        onSuccess: () => {
          toast.success(t("feedbackUpdated"));
          onDone();
        },
        onError: (error) => toast.error(t("updateFailed"), { description: error.message }),
        onSettled: () => setSubmitting(null),
      },
    );
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>{t("feedbackDetails")}</SheetTitle>
        <SheetDescription>{formatDate(item.createdAt, language, true)}</SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-4 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{t(`feedbackKind_${item.kind}`)}</Badge>
          <Badge variant="outline" className={cn(REPORT_STATUS_TONE[item.status])}>
            {t(`reportStatus_${item.status}`)}
          </Badge>
        </div>
        <DetailRow label={t("colMessage")}>
          <p className="rounded-md border border-border bg-muted/40 p-2 break-words whitespace-pre-wrap">{item.message}</p>
        </DetailRow>
        <DetailRow label={t("colSender")}>{item.user.displayName}</DetailRow>
        {item.page && (
          <DetailRow label={t("sentFrom")}>
            <code className="break-all">{item.page}</code>
          </DetailRow>
        )}
      </div>

      <SheetFooter>
        <Button onClick={() => submit("RESOLVED")} disabled={update.isPending}>
          {submitting === "RESOLVED" ? <Spinner /> : <CheckCircle2 />} {t("resolve")}
        </Button>
        {item.status !== "REVIEWING" && (
          <Button variant="outline" onClick={() => submit("REVIEWING")} disabled={update.isPending}>
            {submitting === "REVIEWING" ? <Spinner /> : <Eye />} {t("markReviewing")}
          </Button>
        )}
        {item.status !== "DISMISSED" && (
          <Button variant="ghost" onClick={() => submit("DISMISSED")} disabled={update.isPending}>
            {submitting === "DISMISSED" ? <Spinner /> : <XCircle />} {t("dismiss")}
          </Button>
        )}
      </SheetFooter>
    </>
  );
}
