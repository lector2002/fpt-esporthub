"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateUserStatus } from "../api";
import { useAdminMessages } from "../messages";
import type { AdminUser, UserStatus } from "../types";

export function UserStatusDialog({
  user,
  nextStatus,
  onClose,
}: {
  user: AdminUser;
  nextStatus: UserStatus | null;
  onClose: () => void;
}) {
  const { t } = useAdminMessages();
  const update = useUpdateUserStatus();
  const [note, setNote] = useState("");

  const close = () => {
    setNote("");
    onClose();
  };

  const onConfirm = (event: React.MouseEvent) => {
    event.preventDefault();
    if (!nextStatus) return;
    update.mutate(
      { userId: user.id, status: nextStatus, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(t("statusUpdated"));
          close();
        },
        onError: (error) => toast.error(t("updateFailed"), { description: error.message }),
      },
    );
  };

  return (
    <AlertDialog open={nextStatus !== null} onOpenChange={(open) => !open && !update.isPending && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("changeStatusTitle", { name: user.displayName })}</AlertDialogTitle>
          <AlertDialogDescription>
            {nextStatus &&
              t("changeStatusDescription", { from: t(`status_${user.status}`), to: t(`status_${nextStatus}`) })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor={`status-note-${user.id}`}>{t("noteLabel")}</FieldLabel>
          <Textarea
            id={`status-note-${user.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            rows={3}
          />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={update.isPending}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant={nextStatus === "BANNED" ? "destructive" : "default"}
            disabled={update.isPending}
            onClick={onConfirm}
          >
            {update.isPending && <Spinner />} {t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
