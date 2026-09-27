"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { GameSlug } from "@/lib/contracts";
import { useUpdateProfile } from "../api";
import { useProfileMessages } from "../messages";
import type { UpdateProfileInput } from "../types";

/** A form's edits: `patch` is null while it matches the server; `invalid` blocks saving. */
export interface Draft {
  patch: Omit<UpdateProfileInput, "game"> | null;
  invalid: boolean;
}

const DraftContext = createContext<(id: string, draft: Draft | null) => void>(() => {});

/** Reports a form's edits to the page's single save bar. */
export function useDraft(id: string, draft: Draft) {
  const report = useContext(DraftContext);
  const serialized = JSON.stringify(draft);
  useEffect(() => report(id, JSON.parse(serialized)), [id, serialized, report]);
  useEffect(() => () => report(id, null), [id, report]);
}

/** Collects edits from every form below and saves them in one request, from a bar that shows only while something changed. */
export function ProfileDraft({ game, onDiscard, children }: { game: GameSlug; onDiscard: () => void; children: React.ReactNode }) {
  const { t } = useProfileMessages();
  const update = useUpdateProfile();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const report = useCallback(
    (id: string, draft: Draft | null) =>
      setDrafts((current) => {
        const next = { ...current };
        if (draft) next[id] = draft;
        else delete next[id];
        return next;
      }),
    [],
  );
  const changed = Object.values(drafts).filter((draft) => draft.patch);
  const dirty = changed.length > 0;
  const invalid = changed.some((draft) => draft.invalid);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = () =>
    update.mutate(Object.assign({ game }, ...changed.map((draft) => draft.patch)), {
      onSuccess: () => toast.success(t("saved")),
      onError: (error) => toast.error(error.message),
    });

  return (
    <DraftContext.Provider value={report}>
      {children}
      {dirty && (
        <div
          role="region"
          aria-label={t("unsaved")}
          className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-card px-4 py-3 shadow-lg md:bottom-4"
        >
          <p className="text-sm font-medium">{t("unsaved")}</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onDiscard} disabled={update.isPending}>
              {t("discard")}
            </Button>
            <Button onClick={save} disabled={invalid || update.isPending}>
              {update.isPending && <Spinner />} {update.isPending ? t("saving") : t("saveChanges")}
            </Button>
          </div>
        </div>
      )}
    </DraftContext.Provider>
  );
}
