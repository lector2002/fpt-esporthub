"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, MessageSquareText, Save, StickyNote, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, QueryState } from "@/components/common/query-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useAdminFeedback, useUpdateFeedback } from "../api";
import { REPORT_STATUS_TONE, STACK_ON_PHONE, formatDate } from "../format";
import { useAdminMessages } from "../messages";
import { FEEDBACK_KINDS, REPORT_STATUSES, type AdminFeedback, type AdminFeedbackPage, type FeedbackKind, type ReportStatus } from "../types";
import { FeedbackStats } from "./feedback-stats";
import { Pagination } from "./pagination";
import { SearchBar } from "./search-bar";

type KindFilter = FeedbackKind | "ALL";

const toStatus = (value: string | null): ReportStatus => REPORT_STATUSES.find((status) => status === value) ?? "PENDING";

export function FeedbackTab() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<ReportStatus>(() => toStatus(searchParams.get("status")));
  const [kind, setKind] = useState<KindFilter>("ALL");
  const [q, setQ] = useState("");
  const [path, setPath] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const feedback = useAdminFeedback({ status, kind: kind === "ALL" ? undefined : kind, q, path: path ?? undefined, page });
  const selected = feedback.data?.items.find((item) => item.id === selectedId) ?? null;
  const { t } = useAdminMessages();

  /** Any filter change starts again at page 1. */
  const refilter =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(1);
    };

  return (
    <div className="flex flex-col gap-4">
      <QueryState
        query={feedback}
        skeleton={
          <div className="flex flex-col gap-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
        }
      >
        {(data) => (
          <>
            <FeedbackStats data={data} path={path} onPath={refilter(setPath)} />
            <FeedbackFilters data={data} status={status} kind={kind} path={path} onStatus={refilter(setStatus)} onKind={refilter(setKind)} onSearch={refilter(setQ)} onPath={refilter(setPath)} />
            {data.items.length === 0 ? (
              <EmptyState icon={MessageSquareText} title={t("noFeedback")} />
            ) : (
              <>
                <FeedbackTable items={data.items} onOpen={setSelectedId} />
                <Pagination page={data.page} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
              </>
            )}
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

function FeedbackFilters(props: {
  data: AdminFeedbackPage;
  status: ReportStatus;
  kind: KindFilter;
  path: string | null;
  onStatus: (status: ReportStatus) => void;
  onKind: (kind: KindFilter) => void;
  onSearch: (q: string) => void;
  onPath: (path: string | null) => void;
}) {
  const { t } = useAdminMessages();
  const { counts } = props.data;
  const allKinds = FEEDBACK_KINDS.reduce((sum, kind) => sum + counts.kind[kind], 0);

  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup type="single" variant="outline" value={props.status} onValueChange={(value) => value && props.onStatus(value as ReportStatus)} className="flex-wrap" aria-label={t("colStatus")}>
        {REPORT_STATUSES.map((value) => (
          <ToggleGroupItem key={value} value={value}>
            {t(`reportStatus_${value}`)} <Count value={counts.status[value]} />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup type="single" variant="outline" size="sm" value={props.kind} onValueChange={(value) => value && props.onKind(value as KindFilter)} aria-label={t("colKind")}>
          <ToggleGroupItem value="ALL">
            {t("allKinds")} <Count value={allKinds} />
          </ToggleGroupItem>
          {FEEDBACK_KINDS.map((value) => (
            <ToggleGroupItem key={value} value={value}>
              {t(`feedbackKind_${value}`)} <Count value={counts.kind[value]} />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex min-w-60 flex-1">
          <SearchBar placeholder={t("feedbackSearch")} onSearch={props.onSearch} />
        </div>
        {props.path && (
          <Button variant="outline" size="sm" onClick={() => props.onPath(null)} aria-label={t("clearPage")}>
            {t("filterPage", { page: props.path })} <X />
          </Button>
        )}
      </div>
    </div>
  );
}

function Count({ value }: { value: number }) {
  return <span className="text-muted-foreground tabular-nums">{value}</span>;
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
            <TableCell className="max-w-72">
              <span className="flex items-center gap-1.5">
                <span className="truncate">{item.message}</span>
                {item.adminNote && <StickyNote className="size-3.5 shrink-0 text-muted-foreground" role="img" aria-label={t("hasNote")} />}
              </span>
              {item.page && <code className="block truncate text-xs text-muted-foreground">{item.page}</code>}
            </TableCell>
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
  const [submitting, setSubmitting] = useState<ReportStatus | "note" | null>(null);
  const [note, setNote] = useState(item.adminNote ?? "");
  const noteChanged = note.trim() !== (item.adminNote ?? "");

  /** A status change also saves an edited note, so closing an item never drops it. */
  const submit = (status?: Exclude<ReportStatus, "PENDING">) => {
    setSubmitting(status ?? "note");
    update.mutate(
      { feedbackId: item.id, status, note: noteChanged ? note.trim() : undefined },
      {
        onSuccess: () => {
          toast.success(status ? t("feedbackUpdated") : t("noteSaved"));
          if (status) onDone();
        },
        onError: (error) => toast.error(t("updateFailed"), { description: error.message }),
        onSettled: () => setSubmitting(null),
      },
    );
  };
  const icon = (target: ReportStatus | "note", Icon: React.ComponentType) => (submitting === target ? <Spinner /> : <Icon />);

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
        <Field>
          <FieldLabel htmlFor={`feedback-note-${item.id}`}>{t("adminNote")}</FieldLabel>
          <Textarea id={`feedback-note-${item.id}`} value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={3} />
          <Button variant="outline" size="sm" className="self-start" onClick={() => submit()} disabled={!noteChanged || update.isPending}>
            {icon("note", Save)} {t("saveNote")}
          </Button>
        </Field>
      </div>

      <SheetFooter>
        <Button onClick={() => submit("RESOLVED")} disabled={update.isPending}>
          {icon("RESOLVED", CheckCircle2)} {t("resolve")}
        </Button>
        {item.status !== "REVIEWING" && (
          <Button variant="outline" onClick={() => submit("REVIEWING")} disabled={update.isPending}>
            {icon("REVIEWING", Eye)} {t("markReviewing")}
          </Button>
        )}
        {item.status !== "DISMISSED" && (
          <Button variant="ghost" onClick={() => submit("DISMISSED")} disabled={update.isPending}>
            {icon("DISMISSED", XCircle)} {t("dismiss")}
          </Button>
        )}
      </SheetFooter>
    </>
  );
}
