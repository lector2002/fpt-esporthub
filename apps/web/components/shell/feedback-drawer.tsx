"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FEEDBACK_KINDS, useSendFeedback, type FeedbackKind } from "@/features/feedback/api";
import { useFeedbackMessages } from "@/features/feedback/messages";

const MESSAGE_MAX = 2000;

/** Tab on the right edge, just below the rewards tab; opens a form that sends app feedback to the admin Feedback tab. */
export function FeedbackDrawer() {
  const { t } = useFeedbackMessages();
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("open")}
        data-testid="feedback-drawer-tab"
        className="fixed top-[calc(50%+2.5rem)] right-0 z-40 flex h-16 w-7 items-center justify-center rounded-l-lg border border-r-0 bg-card text-muted-foreground shadow-lg transition-[width] hover:w-9 hover:text-foreground focus-visible:w-9 focus-visible:outline-none"
      >
        <MessageSquareText className="size-4" aria-hidden />
      </button>
      <SheetContent side="right" className="w-[88%] gap-0 overflow-y-auto sm:max-w-sm" data-testid="feedback-drawer">
        {open && <FeedbackForm onDone={() => setOpen(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function FeedbackForm({ onDone }: { onDone: () => void }) {
  const { t } = useFeedbackMessages();
  const page = usePathname();
  const send = useSendFeedback();
  const [kind, setKind] = useState<FeedbackKind>("BUG");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const messageError =
    submitted && !message.trim()
      ? t("messageRequired")
      : message.length > MESSAGE_MAX
        ? t("messageTooLong", { max: MESSAGE_MAX })
        : undefined;

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!message.trim() || message.length > MESSAGE_MAX) return;
    send.mutate(
      { kind, message: message.trim(), page },
      {
        onSuccess: () => {
          toast.success(t("sent"));
          onDone();
        },
        onError: (error) => toast.error(t("failed"), { description: error.message }),
      },
    );
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col" noValidate>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <MessageSquareText className="size-5 text-primary" aria-hidden />
          {t("title")}
        </SheetTitle>
        <SheetDescription>{t("hint")}</SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-4 pb-6">
        <FieldSet>
          <FieldLegend variant="label">{t("kindLabel")}</FieldLegend>
          <ToggleGroup
            type="single"
            variant="outline"
            value={kind}
            onValueChange={(value) => value && setKind(value as FeedbackKind)}
            className="w-full"
          >
            {FEEDBACK_KINDS.map((value) => (
              <ToggleGroupItem key={value} value={value} className="flex-1">
                {t(`kind_${value}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldSet>
        <Field data-invalid={Boolean(messageError)}>
          <FieldLabel htmlFor="feedback-message">{t("messageLabel")}</FieldLabel>
          <Textarea
            id="feedback-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t("messagePlaceholder")}
            aria-invalid={Boolean(messageError)}
            rows={6}
          />
          <FieldDescription className="text-right tabular-nums">
            {t("messageCount", { count: message.length, max: MESSAGE_MAX })}
          </FieldDescription>
          {messageError && <FieldError>{messageError}</FieldError>}
        </Field>
        <p className="truncate text-xs text-muted-foreground">{t("pageNote", { page })}</p>
        <Button type="submit" disabled={send.isPending}>
          {send.isPending ? <Spinner /> : <Send />} {t("submit")}
        </Button>
      </div>
    </form>
  );
}
