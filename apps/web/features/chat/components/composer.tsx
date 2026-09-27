"use client";

import { useId, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Loader2, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MESSAGE_MAX_LENGTH, useSendMessage } from "../api";
import { useChatMessages } from "../messages";

/** Enter sends, Shift+Enter adds a newline. The draft comes back if sending fails. */
export function Composer({ conversationId, disabled, placeholder }: { conversationId: string; disabled?: boolean; placeholder?: string }) {
  const { t } = useChatMessages();
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const send = useSendMessage(conversationId);
  const content = draft.trim();
  const tooLong = content.length > MESSAGE_MAX_LENGTH;
  const canSend = !disabled && content.length > 0 && !tooLong && !send.isPending;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    setDraft("");
    send.mutate(content, { onError: () => setDraft((current) => current || content) });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={submit} className="flex items-end gap-2 border-t border-border p-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={inputId} className="sr-only">
          {t("composerLabel")}
        </label>
        <Textarea
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? t("composerPlaceholder")}
          rows={1}
          disabled={disabled}
          className="max-h-32 min-h-10 resize-none"
          aria-invalid={tooLong || undefined}
        />
        {tooLong && <p className="mt-1 text-xs text-destructive">{t("tooLong", { max: MESSAGE_MAX_LENGTH })}</p>}
      </div>
      <Button type="submit" size="icon-lg" disabled={!canSend} aria-label={send.isPending ? t("sending") : t("send")}>
        {send.isPending ? <Loader2 className="animate-spin" /> : <SendHorizontal />}
      </Button>
    </form>
  );
}
