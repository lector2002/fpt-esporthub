"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/session";
import { useReport } from "../api";
import { useSafetyMessages } from "../messages";
import { REPORT_REASONS, type ReportReason, type ReportTargetType } from "../types";
import { SafetyTrigger } from "./safety-trigger";

const DETAILS_MAX = 1000;

export interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  targetName: string;
  /** The user responsible for the target; hides the button when it is the viewer. */
  reportedUserId?: string;
}

export function ReportButton({ targetType, targetId, targetName, reportedUserId }: ReportButtonProps) {
  const { t } = useSafetyMessages();
  const { user } = useSession();
  const [open, setOpen] = useState(false);

  const ownerId = reportedUserId ?? (targetType === "user" ? targetId : undefined);
  if (!user || ownerId === user.id) return null;

  return (
    <>
      <SafetyTrigger icon={Flag} label={t("report")} onOpen={() => setOpen(true)} />
      <ReportDialog open={open} onOpenChange={setOpen} targetType={targetType} targetId={targetId} targetName={targetName} />
    </>
  );
}

export function ReportDialog({
  open,
  onOpenChange,
  ...target
}: Pick<ReportButtonProps, "targetType" | "targetId" | "targetName"> & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{open && <ReportForm {...target} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function ReportForm({
  targetType,
  targetId,
  targetName,
  onDone,
}: Pick<ReportButtonProps, "targetType" | "targetId" | "targetName"> & { onDone: () => void }) {
  const { t } = useSafetyMessages();
  const report = useReport();
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const reasonError = submitted && !reason ? t("reasonRequired") : undefined;
  const detailsError = details.length > DETAILS_MAX ? t("detailsTooLong", { max: DETAILS_MAX }) : undefined;

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!reason || detailsError) return;
    report.mutate(
      { targetType, targetId, reason, details: details.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(t("reportSent"));
          onDone();
        },
        onError: (error) => toast.error(t("reportFailed"), { description: error.message }),
      },
    );
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{t("reportTitle", { name: targetName })}</DialogTitle>
        <DialogDescription>{t("reportDescription")}</DialogDescription>
      </DialogHeader>

      <FieldSet>
        <FieldLegend variant="label">{t("reasonLabel")}</FieldLegend>
        <RadioGroup
          value={reason}
          onValueChange={(value) => setReason(value as ReportReason)}
          aria-invalid={Boolean(reasonError)}
          className="grid-cols-1 sm:grid-cols-2"
        >
          {REPORT_REASONS.map((value) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem value={value} id={`report-reason-${value}`} />
              <Label htmlFor={`report-reason-${value}`} className="font-normal">
                {t(`reason_${value}`)}
              </Label>
            </div>
          ))}
        </RadioGroup>
        {reasonError && <FieldError>{reasonError}</FieldError>}
      </FieldSet>

      <Field data-invalid={Boolean(detailsError)}>
        <FieldLabel htmlFor="report-details">{t("detailsLabel")}</FieldLabel>
        <Textarea
          id="report-details"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder={t("detailsPlaceholder")}
          aria-invalid={Boolean(detailsError)}
          rows={4}
        />
        <FieldDescription className="text-right tabular-nums">
          {t("detailsCount", { count: details.length, max: DETAILS_MAX })}
        </FieldDescription>
        {detailsError && <FieldError>{detailsError}</FieldError>}
      </Field>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={report.isPending}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={report.isPending}>
          {report.isPending ? <Spinner /> : <Flag />} {t("submitReport")}
        </Button>
      </DialogFooter>
    </form>
  );
}
